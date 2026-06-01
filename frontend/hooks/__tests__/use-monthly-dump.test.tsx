import { renderHook, waitFor } from '@testing-library/react-native';
import { useMonthlyDump } from '../use-monthly-dump';
import { MonthlyDumpService } from '@/services/monthly-dump-service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock MonthlyDumpService
jest.mock('@/services/monthly-dump-service');

// Mock useAuth
jest.mock('../use-auth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  
  return Wrapper;
};

describe('useMonthlyDump Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is enabled during the last 3 days of the month (e.g., April 29)', async () => {
    jest.setSystemTime(new Date('2026-04-29T12:00:00Z'));
    
    const { result } = renderHook(() => useMonthlyDump(), { wrapper: createWrapper() });
    
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.month).toBe('2026-04');
  });

  it('is enabled during the first 4 days of the month (e.g., May 2)', async () => {
    jest.setSystemTime(new Date('2026-05-02T12:00:00Z'));
    
    const { result } = renderHook(() => useMonthlyDump(), { wrapper: createWrapper() });
    
    expect(result.current.isEnabled).toBe(true);
    // Should be checking for April's dump because it's early May
    expect(result.current.month).toBe('2026-04');
  });

  it('is disabled in the middle of the month (e.g., April 15)', async () => {
    jest.setSystemTime(new Date('2026-04-15T12:00:00Z'));
    
    const { result } = renderHook(() => useMonthlyDump(), { wrapper: createWrapper() });
    
    expect(result.current.isEnabled).toBe(false);
  });

  it('handles 404 (not found) when fetching dump', async () => {
    jest.setSystemTime(new Date('2026-04-29T12:00:00Z'));
    (MonthlyDumpService.getMonthlyDump as jest.Mock).mockResolvedValue(null);
    
    const { result } = renderHook(() => useMonthlyDump(), { wrapper: createWrapper() });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.hasDump).toBe(false);
    expect(result.current.slides).toEqual([]);
  });

  it('successfully fetches and transforms slides', async () => {
    jest.setSystemTime(new Date('2026-04-29T12:00:00Z'));
    const mockResponse = {
      status: 'completed',
      slides: [
        { type: 'image', storage_path: 'test/path.jpg', duration_seconds: 5 }
      ]
    };
    (MonthlyDumpService.getMonthlyDump as jest.Mock).mockResolvedValue(mockResponse);
    
    const { result } = renderHook(() => useMonthlyDump(), { wrapper: createWrapper() });
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.hasDump).toBe(true);
    expect(result.current.slides[0].url).toBeDefined();
    expect(result.current.slides[0].type).toBe('image');
  });
});
