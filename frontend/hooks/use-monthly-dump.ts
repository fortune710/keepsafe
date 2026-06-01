import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { CachedMonthlyDump, MonthlyDumpService, MonthlyDumpSlide } from '@/services/monthly-dump-service';
import { monthSchema } from '@/lib/validations/monthly-dump';
import { getDate, getDaysInMonth, subMonths, format } from 'date-fns';
import { useMemo } from 'react';
import { STORAGE_BUCKETS } from '@/constants/supabase';

export interface UseMonthlyDumpResult {
  hasDump: boolean;
  slides: MonthlyDumpSlide[];
  isLoading: boolean;
  status?: string;
  month?: string;
  isEnabled: boolean;
}

const SUPABASE_STORAGE_PUBLIC_SEGMENT = '/storage/v1/object/public/';

function toSlideType(type: string): MonthlyDumpSlide['type'] {
  if (type === 'photo') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  return 'image';
}

function buildSupabasePublicUrl(storagePath?: string): string {
  if (!storagePath) return '';
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return '';

  const sanitizedPath = storagePath.replace(/^\/+/, '');
  if (sanitizedPath.startsWith('http://') || sanitizedPath.startsWith('https://')) {
    return sanitizedPath;
  }

  const [possibleBucket, ...remaining] = sanitizedPath.split('/');
  const hasBucketPrefix = Object.values(STORAGE_BUCKETS).includes(possibleBucket as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]) && remaining.length > 0;
  const bucket = hasBucketPrefix ? possibleBucket : STORAGE_BUCKETS.MONTHLY_DUMPS;
  const path = hasBucketPrefix ? remaining.join('/') : sanitizedPath;

  return `${baseUrl}${SUPABASE_STORAGE_PUBLIC_SEGMENT}${bucket}/${path}`;
}

function mergePendingLocalSlides(remoteSlides: MonthlyDumpSlide[], cached?: CachedMonthlyDump | null): MonthlyDumpSlide[] {
  if (!cached?.slides?.length) return remoteSlides;

  const remoteEntryIds = new Set(remoteSlides.map((slide) => slide.entry_id).filter(Boolean));
  const pendingLocalSlides = cached.slides.filter((slide) => {
    if (!slide.url.startsWith('file://')) return false;
    if (!slide.entry_id) return false;
    return !remoteEntryIds.has(slide.entry_id);
  });

  if (!pendingLocalSlides.length) return remoteSlides;
  return [...remoteSlides, ...pendingLocalSlides];
}

export function useMonthlyDump(requestedMonth?: string | null): UseMonthlyDumpResult {
  const { user } = useAuth();

  const { isEnabled, dumpMonth } = useMemo(() => {
    if (requestedMonth === null) {
      return { isEnabled: false, dumpMonth: '' };
    }

    if (requestedMonth !== undefined) {
      const parsedMonth = monthSchema.safeParse(requestedMonth);
      if (!parsedMonth.success) {
        return { isEnabled: false, dumpMonth: '' };
      }

      return { isEnabled: true, dumpMonth: parsedMonth.data };
    }

    const today = new Date();
    const date = getDate(today);
    const daysInMonth = getDaysInMonth(today);

    const isFirst4Days = date <= 4;
    const isLast3Days = date > daysInMonth - 3;

    const enabled = isFirst4Days || isLast3Days;

    let month: string;
    if (isFirst4Days) {
      // If we are in the first 4 days of May, we want April's dump
      month = format(subMonths(today, 1), 'yyyy-MM');
    } else {
      // If we are in the last 3 days of April, we want April's dump
      month = format(today, 'yyyy-MM');
    }

    return { isEnabled: enabled, dumpMonth: month };
  }, [requestedMonth]);

  const { data, isLoading } = useQuery({
    queryKey: ['monthlyDump', user?.id, dumpMonth],
    queryFn: async () => {
      if (!user?.id || !dumpMonth) return null;

      const cachedDump = await MonthlyDumpService.getCachedMonthlyDump(user.id, dumpMonth);

      try {
        const response = await MonthlyDumpService.getMonthlyDump(user.id, dumpMonth);
        if (!response) {
          if (cachedDump) return cachedDump;
          return { hasDump: false, slides: [] };
        }

        const transformedSlides = (response.slides || []).map((slide) => ({
          ...slide,
          type: toSlideType(slide.type as string),
          url: slide.url || buildSupabasePublicUrl(slide.storage_path),
        }));

        const mergedSlides = mergePendingLocalSlides(transformedSlides, cachedDump);
        const payload = {
          hasDump: response.status === 'completed',
          slides: mergedSlides,
          status: response.status,
        };
        await MonthlyDumpService.setCachedMonthlyDump(user.id, dumpMonth, payload);

        return payload;
      } catch (error) {
        if (cachedDump) return cachedDump;
        return { hasDump: false, slides: [] };
      }
    },
    enabled: isEnabled && !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    hasDump: data?.hasDump ?? false,
    slides: data?.slides ?? [],
    isLoading,
    status: data?.status,
    month: dumpMonth,
    isEnabled,
  };
}
