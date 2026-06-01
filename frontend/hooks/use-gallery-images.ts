import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import * as MediaLibrary from 'expo-media-library';

import { MonthlyDumpGridPhoto } from '@/services/monthly-dump-service';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const PAGE_SIZE = 24;

interface UseGalleryImagesResult {
  photos: MonthlyDumpGridPhoto[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  permissionGranted: boolean;
  requestPermission: () => Promise<MediaLibrary.PermissionResponse>;
}

function getMonthBounds(month: string): { startMs: number; endMs: number } | null {
  const parsed = monthSchema.safeParse(month);
  if (!parsed.success) return null;

  const [yearText, monthText] = parsed.data.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex)) return null;

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

/**
 * Loads month-scoped device gallery images for the monthly grid picker.
 */
export function useGalleryImages(month: string, enabled = true): UseGalleryImagesResult {
  const monthBounds = useMemo(() => getMonthBounds(month), [month]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  const permissionGranted = permissionResponse?.status === 'granted';

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['monthly-dump-gallery', monthBounds?.startMs, monthBounds?.endMs],
    queryFn: async ({ pageParam = undefined as string | undefined }) => {
      if (!monthBounds) {
        return {
          assets: [],
          endCursor: undefined,
          hasNextPage: false,
          totalCount: 0,
        } as any;
      }

      return MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after: pageParam,
        createdAfter: monthBounds.startMs,
        createdBefore: monthBounds.endMs,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [MediaLibrary.SortBy.creationTime],
      } as any);
    },
    getNextPageParam: (lastPage: any) => (lastPage?.hasNextPage ? lastPage.endCursor : undefined),
    enabled: enabled && !!monthBounds && permissionGranted,
    initialPageParam: undefined,
  });

  const photos = useMemo(() => {
    const allAssets = data?.pages.flatMap((page: any) => page?.assets || []) || [];
    const seen = new Set<string>();

    return allAssets
      .filter((asset: any) => {
        if (seen.has(asset.id)) return false;
        seen.add(asset.id);
        return true;
      })
      .map((asset: any) => ({
        id: asset.id,
        content_url: asset.uri,
      }));
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
    permissionGranted,
    requestPermission,
  };
}
