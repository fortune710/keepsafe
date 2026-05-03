import { z } from 'zod';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { TABLES, STORAGE_BUCKETS } from '@/constants/supabase';
import { convertToArrayBuffer } from '@/lib/utils';
import { deviceStorage } from './device-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const MONTHLY_DUMP_CACHE_TTL_MINUTES = 31 * 24 * 60;
const MONTHLY_DUMP_GRID_QUEUE_KEY = 'monthly_dump_grid_queue';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const userIdSchema = z.string().min(1);

const monthlyDumpGridPhotoSchema = z.object({
  id: z.string().min(1),
  content_url: z.string().url(),
});

const monthlyDumpSlideSchema = z.object({
  type: z.enum(['image', 'video', 'audio']),
  url: z.string().min(1),
  duration_seconds: z.number().min(1),
  entry_id: z.string().optional(),
  storage_path: z.string().optional(),
});

export type MonthlyDumpSlide = z.infer<typeof monthlyDumpSlideSchema>;

export interface MonthlyDumpResponse {
  status: 'completed' | 'pending' | 'processing' | 'failed';
  slides: MonthlyDumpSlide[];
}

export interface MonthlyDumpGridPhoto {
  id: string;
  content_url: string;
}

export interface CachedMonthlyDump {
  hasDump: boolean;
  slides: MonthlyDumpSlide[];
  status?: MonthlyDumpResponse['status'];
}

interface MonthlyDumpGridQueueItem {
  idempotencyKey: string;
  userId: string;
  month: string;
  localGridUri: string;
  optimisticSlide: MonthlyDumpSlide;
}

export class MonthlyDumpService {
  private static queueInMemory: MonthlyDumpGridQueueItem[] | null = null;
  private static isProcessingQueue = false;

  private static cacheKey(userId: string, month: string): string {
    return `monthly_dump_${userId}_${month}`;
  }

  private static resolveStorageTarget(storagePath: string): { bucket: string; path: string } {
    const sanitizedPath = storagePath.replace(/^\/+/, '');
    const [possibleBucket, ...remainingPath] = sanitizedPath.split('/');
    const hasBucketPrefix =
      Object.values(STORAGE_BUCKETS).includes(
        possibleBucket as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]
      ) && remainingPath.length > 0;

    if (hasBucketPrefix) {
      return { bucket: possibleBucket, path: remainingPath.join('/') };
    }

    return { bucket: STORAGE_BUCKETS.MONTHLY_DUMPS, path: sanitizedPath };
  }

  private static async loadGridQueue(): Promise<MonthlyDumpGridQueueItem[]> {
    if (this.queueInMemory) return this.queueInMemory;
    const existing = await deviceStorage.getItem<MonthlyDumpGridQueueItem[]>(MONTHLY_DUMP_GRID_QUEUE_KEY);
    this.queueInMemory = Array.isArray(existing) ? existing : [];
    return this.queueInMemory;
  }

  private static async saveGridQueue(queue: MonthlyDumpGridQueueItem[]): Promise<void> {
    this.queueInMemory = queue;
    await deviceStorage.setItem(MONTHLY_DUMP_GRID_QUEUE_KEY, queue);
  }

  private static async peekGridQueueItem(): Promise<MonthlyDumpGridQueueItem | undefined> {
    const queue = await this.loadGridQueue();
    return queue[0];
  }

  private static async removeGridQueueItem(idempotencyKey: string): Promise<void> {
    const queue = await this.loadGridQueue();
    const filtered = queue.filter((item) => item.idempotencyKey !== idempotencyKey);
    await this.saveGridQueue(filtered);
  }

  private static async processGridQueueItem(item: MonthlyDumpGridQueueItem): Promise<void> {
    const uploaded = await this.saveCreatedGridImageToStorage({
      userId: item.userId,
      month: item.month,
      gridImageUri: item.localGridUri,
    });

    const monthDate = `${item.month}-01`;
    const { data: dump, error: dumpError } = await supabase
      .from(TABLES.MONTHLY_DUMPS)
      .select('id, slides, grid_count')
      .eq('user_id', item.userId)
      .eq('month', monthDate)
      .maybeSingle();

    if (dumpError) {
      throw new Error(dumpError.message);
    }

    if (!dump) {
      throw new Error('Monthly dump does not exist for this month.');
    }

    const existingSlides = ((dump as any).slides ?? []) as any[];
    const existingIndex = existingSlides.findIndex(
      (slide) => slide?.entry_id && slide.entry_id === item.optimisticSlide.entry_id
    );

    const finalSlide = {
      ...item.optimisticSlide,
      url: uploaded.url,
      storage_path: undefined,
    };

    const nextSlides = [...existingSlides];
    if (existingIndex >= 0) {
      nextSlides[existingIndex] = finalSlide;
    } else {
      nextSlides.push(finalSlide);
    }

    const { error: updateError } = await supabase
      .from(TABLES.MONTHLY_DUMPS)
      .update({
        slides: nextSlides as any,
        grid_count: existingIndex >= 0 ? (dump as any).grid_count : (((dump as any).grid_count ?? 0) + 1),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', (dump as any).id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await this.replaceCachedGridSlideUrl({
      userId: item.userId,
      month: item.month,
      entryId: item.optimisticSlide.entry_id ?? '',
      nextUrl: uploaded.url,
    });

    deviceStorage.emit('monthlyDumpUpdated', {
      userId: item.userId,
      month: item.month,
      entryId: item.optimisticSlide.entry_id,
      url: uploaded.url,
    });
  }

  private static async startGridQueueProcessor(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      let next: MonthlyDumpGridQueueItem | undefined;
      // eslint-disable-next-line no-constant-condition
      while ((next = await this.peekGridQueueItem())) {
        try {
          await this.processGridQueueItem(next);
          // Only remove after successful processing
          await this.removeGridQueueItem(next.idempotencyKey);
        } catch (error) {
          logger.error('Monthly dump custom grid queue item failed', { error, next });
          // Optionally: on failure, we could implement a retry counter or backoff.
          // For now, we'll keep it in the queue for a retry on next app launch/processor start,
          // but we MUST break the loop to avoid an infinite failing loop.
          break;
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Fetches a completed monthly dump directly from Supabase.
   */
  static async getMonthlyDump(userId: string, month: string): Promise<MonthlyDumpResponse | null> {
    userIdSchema.parse(userId);
    monthSchema.parse(month);

    try {
      const monthDate = `${month}-01`;
      const { data: dump, error: dumpError } = await supabase
        .from(TABLES.MONTHLY_DUMPS)
        .select('*')
        .eq('user_id', userId)
        .eq('month', monthDate)
        .eq('status', 'completed')
        .maybeSingle();

      if (dumpError) {
        logger.error('Error fetching monthly dump from Supabase', { dumpError, userId, month });
        throw new Error('Failed to retrieve monthly dump. Please try again later.');
      }

      if (!dump) {
        logger.info('No completed monthly dump found for user', { userId, month });
        return null;
      }

      const dumpSlides = ((dump as any)?.slides ?? []) as any[];
      const hydratedSlides = await Promise.all(
        dumpSlides.map(async (slide) => {
          if (!slide?.storage_path) return slide;
          if (slide?.url) return slide;

          const { storage_path, ...rest } = slide;
          const { bucket, path } = this.resolveStorageTarget(storage_path);
          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(path);

          return { ...rest, storage_path, url: publicUrl };
        })
      );

      return {
        status: 'completed',
        slides: hydratedSlides as MonthlyDumpSlide[],
      };
    } catch (error) {
      logger.error('MonthlyDumpService.getMonthlyDump error', { error });
      throw error;
    }
  }

  static async getEntries(
    userId: string,
    month: string,
    type: 'photo' | 'video' | 'audio' = 'photo',
    page = 1
  ) {
    userIdSchema.parse(userId);
    monthSchema.parse(month);
    z.enum(['photo', 'video', 'audio']).parse(type);
    z.number().int().min(1).parse(page);

    try {
      const { apiFetch } = await import('@/lib/api-client');
      const url = `${BACKEND_URL}/user/${userId}/entries/${month}?type=${type}&page=${page}`;
      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch entries: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('MonthlyDumpService.getEntries error', { error });
      throw error;
    }
  }

  static async getCachedMonthlyDump(userId: string, month: string): Promise<CachedMonthlyDump | null> {
    userIdSchema.parse(userId);
    monthSchema.parse(month);
    return deviceStorage.getItem<CachedMonthlyDump>(this.cacheKey(userId, month));
  }

  static async setCachedMonthlyDump(userId: string, month: string, payload: CachedMonthlyDump): Promise<void> {
    userIdSchema.parse(userId);
    monthSchema.parse(month);

    const validatedSlides = z.array(monthlyDumpSlideSchema).parse(payload.slides);

    await deviceStorage.setItem(
      this.cacheKey(userId, month),
      {
        hasDump: payload.hasDump,
        status: payload.status,
        slides: validatedSlides,
      },
      MONTHLY_DUMP_CACHE_TTL_MINUTES
    );
  }

  static async create3x2GridImage(
    photos: MonthlyDumpGridPhoto[],
    captureGridImage: (photos: MonthlyDumpGridPhoto[]) => Promise<string>
  ): Promise<string> {
    const validatedPhotos = z.array(monthlyDumpGridPhotoSchema).min(1).max(6).parse(photos);
    if (typeof captureGridImage !== 'function') {
      throw new Error('captureGridImage must be a function.');
    }

    const localUri = await captureGridImage(validatedPhotos);
    z.string().min(1).parse(localUri);
    return localUri.startsWith('file://') ? localUri : `file://${localUri}`;
  }

  static async saveCreatedGridImageToStorage(params: {
    userId: string;
    month: string;
    gridImageUri: string;
  }): Promise<{ url: string; storagePath: string }> {
    const schema = z.object({
      userId: userIdSchema,
      month: monthSchema,
      gridImageUri: z.string().min(1),
    });

    const { userId, month, gridImageUri } = schema.parse(params);
    const uploadData = await convertToArrayBuffer(gridImageUri);
    const fileName = `${userId}/monthly-dumps/${month}/grid_${Date.now()}.png`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.MEDIA)
      .upload(fileName, uploadData, {
        cacheControl: '3600',
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKETS.MEDIA).getPublicUrl(data.path);

    return {
      url: publicUrl,
      storagePath: data.path,
    };
  }

  static async enqueueCustomGridCreation(params: {
    userId: string;
    month: string;
    photos: MonthlyDumpGridPhoto[];
    captureGridImage: (photos: MonthlyDumpGridPhoto[]) => Promise<string>;
  }): Promise<MonthlyDumpSlide> {
    const schema = z.object({
      userId: userIdSchema,
      month: monthSchema,
      photos: z.array(monthlyDumpGridPhotoSchema).min(1).max(6),
      captureGridImage: z.custom<(photos: MonthlyDumpGridPhoto[]) => Promise<string>>((val) => typeof val === 'function'),
    });

    const { userId, month, photos, captureGridImage } = schema.parse(params);
    if (typeof captureGridImage !== 'function') {
      throw new Error('captureGridImage must be a function.');
    }
    const localGridUri = await this.create3x2GridImage(photos, captureGridImage);
    const entryId = `custom-grid-${Date.now()}`;

    const optimisticSlide: MonthlyDumpSlide = {
      type: 'image',
      url: localGridUri,
      duration_seconds: 6,
      entry_id: entryId,
    };

    const cached = await this.getCachedMonthlyDump(userId, month);
    const nextSlides = [...(cached?.slides ?? []), optimisticSlide];
    await this.setCachedMonthlyDump(userId, month, {
      hasDump: true,
      status: cached?.status ?? 'completed',
      slides: nextSlides,
    });

    const queue = await this.loadGridQueue();
    const idempotencyKey = `${userId}-${month}-${entryId}`;
    const alreadyQueued = queue.some((item) => item.idempotencyKey === idempotencyKey);

    if (!alreadyQueued) {
      queue.push({
        idempotencyKey,
        userId,
        month,
        localGridUri,
        optimisticSlide,
      });
      await this.saveGridQueue(queue);
      void this.startGridQueueProcessor();
    }

    return optimisticSlide;
  }

  static async replaceCachedGridSlideUrl(params: {
    userId: string;
    month: string;
    entryId: string;
    nextUrl: string;
  }): Promise<void> {
    const schema = z.object({
      userId: userIdSchema,
      month: monthSchema,
      entryId: z.string().min(1),
      nextUrl: z.string().min(1),
    });
    const { userId, month, entryId, nextUrl } = schema.parse(params);

    const cached = await this.getCachedMonthlyDump(userId, month);
    if (!cached) return;

    const updatedSlides = cached.slides.map((slide) => {
      if (slide.entry_id !== entryId) return slide;
      return {
        ...slide,
        url: nextUrl,
      };
    });

    await this.setCachedMonthlyDump(userId, month, {
      ...cached,
      slides: updatedSlides,
    });
  }
}
