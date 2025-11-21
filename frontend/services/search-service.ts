import { logger } from '@/lib/logger';
import { fetch as expoFetch } from 'expo/fetch';

interface StreamSearchOptions {
  userId: string;
  query: string;
  /**
   * Called for each text chunk received from the backend search stream.
   */
  onMessage: (chunk: string) => void;
  /**
   * Called when the stream ends successfully.
   */
  onFinish?: () => void;
  /**
   * Called when an error occurs while streaming.
   */
  onError?: (error: Error) => void;
  /**
   * Optional AbortSignal to allow callers to cancel an in-flight search.
   */
  signal?: AbortSignal;
}

/**
 * SearchService is responsible for talking to the backend FastAPI `/search/stream`
 * endpoint and exposing a simple streaming API to the frontend.
 *
 * It mirrors the style of other services in this folder: a class with static methods.
 */
export class SearchService {
  // Base URL for the FastAPI backend. Override via env in different environments.
  private static readonly BASE_URL =
    process.env.EXPO_PUBLIC_SEARCH_API_URL ?? 'http://localhost:8000';

  /**
   * Streams search results from the backend and forwards text chunks to `onMessage`.
   *
   * The backend uses Server-Sent Events (SSE) with lines like `data: <chunk>`.
   * We parse those lines and invoke the callback with the decoded text content.
   */
  static async streamSearch(options: StreamSearchOptions): Promise<void> {
    const { userId, query, onMessage, onFinish, onError, signal } = options;

    const url = `${this.BASE_URL}/search/stream`;

    try {
      logger.info('SearchService: starting search request', {
        url,
        method: 'POST',
        body: { user_id: userId, query },
      });

      // NOTE: Previous implementation using the global fetch has been kept here
      // for reference but is no longer used. We now rely on expo/fetch so that
      // streaming (body.getReader) works reliably in React Native.
      //
      // const response = await fetch(url, { ... });

      const response = await expoFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          user_id: userId,
          query,
        }),
        signal,
      });

      logger.info('SearchService: received response headers', {
        url,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const error = new Error(`Search request failed with status ${response.status}`);
        onError?.(error);
        try {
          const errorText = await response.text();
          logger.error('SearchService: non-OK response body', {
            status: response.status,
            body: errorText,
          });
        } catch {
          // ignore body-read errors here
        }
        throw error;
      }

      // expo/fetch ensures the Response has a readable body with getReader support
      const body: any = (response as any).body;
      const reader =
        body && typeof body.getReader === 'function'
          ? body.getReader()
          : null;

      // If streaming reader is not available (some React Native environments),
      // fall back to reading the whole text at once and emitting it as a single chunk.
      if (!reader) {
        logger.info('SearchService: no streaming body, falling back to response.text()', {
          url,
        });
        const text = await response.text();
        logger.debug('SearchService: non-streaming response text', text);
        // The backend wraps messages as `data: <message>`, possibly multiple lines.
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          onMessage(data);
        }
        onFinish?.();
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processLines = (raw: string) => {
        let data = raw.replace(/data:/g, '').replace(/\[DONE\]/g, '').trim();
        if (!data) return;
        logger.debug('SearchService: SSE chunk', data);
        onMessage(data);
      };

      // Stream loop
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        let lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        // Process all complete lines; keep the last partial line in `buffer`
        if (lines.length > 0) {
          processLines(lines.join('\n'));
        }
      }

      // Flush any remaining buffered data after the stream ends so we don't lose
      // the tail of the message if the server didn't end with a newline.
      if (buffer.trim().length > 0) {
        processLines(buffer);
      }

      logger.info('SearchService: stream completed successfully', { url });
      logger.info('SearchService: buffer', { buffer });
      onFinish?.();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        logger.info('SearchService: request aborted by caller', { url });
        // Swallow abort errors; caller intentionally cancelled.
        return;
      }
      const error = err instanceof Error ? err : new Error('Search stream failed');
      if (onError) {
        onError(error);
      } else {
        logger.error('SearchService: unhandled error', { error: error.message });
      }
      throw error;
    }
  }
}


