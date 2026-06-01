import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { useAuth } from '@/hooks/use-auth';
import { MonthlyDumpGridPhoto, MonthlyDumpService } from '@/services/monthly-dump-service';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

interface UseMonthlyEntriesResult {
  photos: MonthlyDumpGridPhoto[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * Loads month-scoped app entries for the monthly grid picker.
 */
export function useMonthlyEntries(month: string, enabled = true): UseMonthlyEntriesResult {
  const { user } = useAuth();
  const validatedMonth = useMemo(() => {
    const parsed = monthSchema.safeParse(month);
    return parsed.success ? parsed.data : '';
  }, [month]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['monthly-dump-entries', user?.id, validatedMonth],
    queryFn: async ({ pageParam = 1 }) => {
      if (!user?.id || !validatedMonth) {
        return { data: { entries: [], pagination: { has_more: false, page: 1 } } } as any;
      }

      return MonthlyDumpService.getEntries(user.id, validatedMonth, 'photo', pageParam as number);
    },
    getNextPageParam: (lastPage: any) =>
      lastPage?.data?.pagination?.has_more ? lastPage.data.pagination.page + 1 : undefined,
    enabled: enabled && !!user?.id && !!validatedMonth,
    initialPageParam: 1,
  });

  const photos = useMemo(() => {
    const allPhotos = data?.pages.flatMap((page: any) => page?.data?.entries || []) || [];
    const seen = new Set<string>();

    return allPhotos.filter((photo: MonthlyDumpGridPhoto) => {
      if (seen.has(photo.id)) return false;
      seen.add(photo.id);
      return true;
    });
  }, [data]);

  return {
    photos,
    isLoading,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    refetch,
  };
}
