import { useCallback, useMemo, useRef, useState } from 'react';
import { SearchService, SearchStreamEvent } from '@/services/search-service';
import { useAuthContext } from '@/providers/auth-provider';
import { posthog } from '@/constants/posthog';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

export type SearchRole = 'user' | 'assistant' | 'system';

export interface SearchMessage {
  id: string;
  role: SearchRole;
  content: string;
}

interface UseSearchParams {
  initialMessages?: SearchMessage[];
  onFinish?: (finalAssistantMessage: SearchMessage, allMessages: SearchMessage[]) => void;
}

interface UseSearchResult {
  messages: SearchMessage[];
  isLoading: boolean;
  loadingText: string;
  error: string | null;
  input: string;
  setInput: (value: string) => void;
  startSearch: (overrideQuery?: string) => Promise<void>;
  reset: () => void;
}

export function useSearch(params: UseSearchParams = {}): UseSearchResult {
  const { initialMessages = [], onFinish } = params;
  const { user } = useAuthContext();

  const [messages, setMessages] = useState<SearchMessage[]>(() => [...initialMessages]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMessages([...initialMessages]);
    setInput('');
    setIsLoading(false);
    setLoadingText('');
    setError(null);
  }, [initialMessages]);

  const startSearch = useCallback(
    async (overrideQuery?: string) => {
      if (!user?.id) {
        setError('You must be signed in to search.');
        return;
      }

      const query = overrideQuery ?? input.trim();
      if (!query) return;

      // Cancel any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setLoadingText('Preparing your memories...');
      setError(null);

      // Seed messages with the user query and an empty assistant message for streaming
      const userMessage: SearchMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
      };
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: SearchMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');

      try {
        posthog.capture('ai_search', {
          query: userMessage.content,
          platform: Platform.OS
        })
        await SearchService.streamSearch({
          query,
          signal: controller.signal,
          onEvent: (event: SearchStreamEvent) => {
            if (!event || !event.type) return;

            if (event.type === 'status') {
              setLoadingText(event.text ?? '');
              logger.info('Search stream status update', { text: event.text });
              return;
            }

            if (event.type === 'delta') {
              const chunk = event.text ?? '';
              if (!chunk) return;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.findIndex((m) => m.id === assistantMessageId);
                if (lastIndex === -1) {
                  // If for some reason the assistant message is missing, append a new one
                  updated.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: chunk,
                  });
                  return updated;
                }
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: updated[lastIndex].content + chunk,
                };
                return updated;
              });
              return;
            }

            if (event.type === 'results' && Array.isArray(event.entries)) {
              const jsonBlock = `\n\n\`\`\`json\n${JSON.stringify(
                event.entries,
                null,
                2
              )}\n\`\`\``;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.findIndex((m) => m.id === assistantMessageId);
                if (lastIndex === -1) {
                  updated.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: jsonBlock,
                  });
                  return updated;
                }
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: updated[lastIndex].content + jsonBlock,
                };
                return updated;
              });
              return;
            }

            if (event.type === 'final') {
              setIsLoading(false);
              setLoadingText('');
              logger.info('Search stream final response received', {
                length: event.text?.length ?? 0,
              });
            }
          },
          onError: (err) => {
            logger.error('Search stream error', { error: err.message });
            setError(err.message || 'Something went wrong while searching.');
          },
          onFinish: () => {
            setIsLoading(false);
            setLoadingText('');
            abortRef.current = null;

            if (onFinish) {
              setMessages((current) => {
                const all = [...current];
                const lastAssistant = [...all].reverse().find((m) => m.role === 'assistant');
                if (lastAssistant) {
                  onFinish(lastAssistant, all);
                }
                return all;
              });
            }
          },
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // Swallow aborts
          return;
        }
        logger.error('Search error', { error: err?.message });
        setError(err?.message || 'Search failed.');
        setIsLoading(false);
        setLoadingText('');
        abortRef.current = null;
      }
    },
    [input, onFinish, user?.id]
  );

  const value: UseSearchResult = useMemo(
    () => ({
      messages,
      isLoading,
      loadingText,
      error,
      input,
      setInput,
      startSearch,
      reset,
    }),
    [messages, isLoading, loadingText, error, input, startSearch, reset]
  );

  return value;
}


