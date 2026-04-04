import { logger } from '@/lib/logger';
import { apiFetchStream } from '@/lib/api-client';

export type SearchStreamEventType = 'status' | 'delta' | 'final' | 'results';

export interface SearchStreamEvent {
  type: SearchStreamEventType;
  text?: string;
  entries?: any[];
}

interface StreamSearchOptions {
  query: string;
  /**
   * Called for each parsed stream event.
   */
  onEvent: (event: SearchStreamEvent) => void;
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
    process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

  /**
   * Streams search results from the backend and forwards text chunks to `onMessage`.
   *
   * The backend uses Server-Sent Events (SSE) with lines like `data: <chunk>`.
   * We parse those lines and invoke the callback with the decoded text content.
   * 
   * The user ID is automatically extracted from the Supabase access token by the backend.
   */
  static async streamSearch(options: StreamSearchOptions): Promise<void> {
    const { query, onEvent, onFinish, onError, signal } = options;

    const url = `${this.BASE_URL}/search/stream`;

    try {
      logger.info('SearchService: starting search request', {
        url,
        method: 'POST',
        queryLength: query.length,
      });

      const response = await apiFetchStream(url, {
        method: 'POST',
        body: JSON.stringify({
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
        logger.error('SearchService: non-OK response', {
          status: response.status,
          statusText: response.statusText,

        });
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

      const processEvent = (rawEvent: string) => {
        const lines = rawEvent.split(/\r?\n/);
        const dataLines = lines
          .map((line) => (line.startsWith('data:') ? line.slice(5).trim() : ''))
          .filter((line) => line.length > 0);
        if (dataLines.length === 0) return;

        const payload = dataLines.join('\n');
        if (!payload || payload === '[DONE]') return;

        try {
          const event = JSON.parse(payload) as SearchStreamEvent;
          logger.debug('SearchService: SSE event', { event });
          onEvent(event);
        } catch (error) {
          logger.warn('SearchService: Failed to parse SSE JSON', {
            payload,
            error,
          });
        }
      };

      // If streaming reader is not available (some React Native environments),
      // fall back to reading the whole text at once and emitting it as a single chunk.
      if (!reader) {
        logger.info('SearchService: no streaming body, falling back to response.text()', {
          url,
        });
        const text = await response.text();
        logger.debug('SearchService: non-streaming response text', text);
        // The backend wraps messages as `data: <json>\n\n`.
        const events = text.split(/\r?\n\r?\n/);
        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;
          processEvent(rawEvent);
        }
        onFinish?.();
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // Stream loop
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        let events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue;
          processEvent(rawEvent);
        }
      }

      // Flush any remaining buffered data after the stream ends so we don't lose
      // the tail of the message if the server didn't end with a newline.
      if (buffer.trim().length > 0) {
        processEvent(buffer);
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


