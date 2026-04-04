import { SearchService, SearchStreamEvent } from '../search-service';
import { apiFetchStream } from '@/lib/api-client';
import { TextEncoder } from 'util';

jest.mock('@/lib/api-client', () => ({
  apiFetchStream: jest.fn(),
}));

const createReader = (chunks: string[]) => {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    read: async () => {
      if (index >= chunks.length) {
        return { value: undefined, done: true };
      }
      const value = encoder.encode(chunks[index]);
      index += 1;
      return { value, done: false };
    },
  };
};

describe('SearchService.streamSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses chunked SSE JSON events', async () => {
    const events = [
      'data: {"type":"status","text":"Working"}\n\n',
      'data: {"type":"delta","text":"Hello"}\n\n',
      'data: {"type":"final","text":"Hello"}\n\n',
      'data: {"type":"results","entries":[{"entry_id":"1"}]}\n\n',
    ];

    (apiFetchStream as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: {
        getReader: () => createReader([events[0] + events[1], events[2] + events[3]]),
      },
    });

    const received: SearchStreamEvent[] = [];

    await SearchService.streamSearch({
      query: 'hello',
      onEvent: (event) => received.push(event),
      onFinish: jest.fn(),
    });

    expect(received.map((e) => e.type)).toEqual([
      'status',
      'delta',
      'final',
      'results',
    ]);
    expect(received[0].text).toBe('Working');
    expect(received[1].text).toBe('Hello');
    expect(received[3].entries?.[0]?.entry_id).toBe('1');
  });
});
