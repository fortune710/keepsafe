import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSearch } from '../use-search';
import { SearchService, SearchStreamEvent } from '@/services/search-service';

jest.mock('@/services/search-service', () => ({
  SearchService: {
    streamSearch: jest.fn(),
  },
}));

jest.mock('@/providers/auth-provider', () => ({
  useAuthContext: () => ({ user: { id: 'user-123' } }),
}));

jest.mock('@/constants/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}));

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('streams status, delta, and final events into state', async () => {
    (SearchService.streamSearch as jest.Mock).mockImplementation(
      async ({ onEvent, onFinish }: { onEvent: (event: SearchStreamEvent) => void; onFinish: () => void }) => {
        onEvent({ type: 'status', text: 'Searching your memories...' });
        onEvent({ type: 'delta', text: 'Hello ' });
        onEvent({ type: 'delta', text: 'world' });
        onEvent({ type: 'final', text: 'Hello world' });
        onFinish();
      }
    );

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.startSearch('hello');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.loadingText).toBe('');
    expect(result.current.messages.length).toBe(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toContain('Hello world');
  });

  it('appends results events as JSON blocks', async () => {
    (SearchService.streamSearch as jest.Mock).mockImplementation(
      async ({ onEvent, onFinish }: { onEvent: (event: SearchStreamEvent) => void; onFinish: () => void }) => {
        onEvent({ type: 'delta', text: 'Results:' });
        onEvent({ type: 'results', entries: [{ entry_id: '1', type: 'photo' }] });
        onEvent({ type: 'final', text: 'Done' });
        onFinish();
      }
    );

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.startSearch('hello');
    });

    const assistantMessage = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistantMessage?.content).toContain('```json');
    expect(assistantMessage?.content).toContain('"entry_id": "1"');
  });
});
