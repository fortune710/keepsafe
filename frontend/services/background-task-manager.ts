import { supabase } from '@/lib/supabase';
import { TABLES, STORAGE_BUCKETS, UPLOAD_PATHS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { MediaCapture } from '@/types/media';
import { convertToArrayBuffer, getContentType, getFileExtension, getTimefromTimezone } from '@/lib/utils';
import { RenderedMediaCanvasItem } from '@/types/capture';
import { deviceStorage } from './device-storage';
import { EntryService } from './entry-service';
import { logger } from '@/lib/logger';

type Entry = Database['public']['Tables']['entries']['Row'];
type EntryInsert = Database['public']['Tables']['entries']['Insert'];

interface EntryProcessingData {
  entryId: string;
  userId: string;
  capture: MediaCapture;
  textContent: string;
  musicTag?: string;
  locationTag?: string;
  isPrivate: boolean;
  isEveryone: boolean;
  selectedFriends: string[];
  attachments: RenderedMediaCanvasItem[];
  idempotencyKey: string;
}

// A lightweight foreground queue persisted to device storage.
// This avoids relying on background task registration and runs while the app is active.
const QUEUE_STORAGE_KEY = 'entry_processing_queue';
let isProcessingQueue = false;
let inMemoryQueue: EntryProcessingData[] | null = null;

const loadQueue = async (): Promise<EntryProcessingData[]> => {
  if (inMemoryQueue) return inMemoryQueue;
  try {
    const existing = await deviceStorage.getItem<EntryProcessingData[]>(QUEUE_STORAGE_KEY);
    inMemoryQueue = Array.isArray(existing) ? existing : [];
  } catch {
    inMemoryQueue = [];
  }
  return inMemoryQueue!;
};

const saveQueue = async (queue: EntryProcessingData[]): Promise<void> => {
  inMemoryQueue = queue;
  await deviceStorage.setItem(QUEUE_STORAGE_KEY, queue);
};

const dequeueNext = async (): Promise<EntryProcessingData | undefined> => {
  const queue = await loadQueue();
  const next = queue.shift();
  await saveQueue(queue);
  return next;
};



/**
 * Uploads media to Supabase storage
 */
const uploadMedia = async (
  file: string,
  userId: string,
  fileName: string,
  contentType: string
): Promise<string | null> => {
  const filePath = UPLOAD_PATHS.MEDIA(userId, fileName);

  try {
    const uploadData = await convertToArrayBuffer(file);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.MEDIA)
      .upload(filePath, uploadData, {
        cacheControl: '3600',
        upsert: false,
        contentType
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.MEDIA)
      .getPublicUrl(data.path);

    return publicUrl;

  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};

/**
 * Processes an entry in the background
 */
const processEntry = async (data: EntryProcessingData): Promise<{ success: boolean; entry?: Entry; error?: string }> => {
  try {
    console.log('Processing entry in background:', data.entryId);

    // Update status to processing
    await deviceStorage.updateEntry(data.userId, data.entryId, {
      status: 'processing',
      processingStartedAt: new Date().toISOString()
    });
    deviceStorage.emit('entryStatusChanged', {
      userId: data.userId,
      entryId: data.entryId,
      status: 'processing'
    });

    // Prepare entry data
    let finalContentUrl = data.capture.uri;

    // Upload media to Supabase storage
    try {
      const timestamp = Date.now();
      const fileExtension = getFileExtension(data.capture.type);
      const fileName = `${data.capture.type}_${timestamp}.${fileExtension}`;
      const contentType = getContentType(data.capture.type);

      const uploadedUrl = await uploadMedia(data.capture.uri, data.userId, fileName, contentType);

      if (!uploadedUrl) {
        throw new Error('Failed to upload media to storage');
      }

      finalContentUrl = uploadedUrl;
    } catch (uploadError) {
      console.error('Media upload error:', uploadError);
      throw new Error('Failed to upload media. Please try again.');
    }

    const sharedWith = data.isPrivate ? [data.userId] : [data.userId, ...data.selectedFriends];

    const createdAt = getTimefromTimezone().toISOString();

    const newEntry: EntryInsert = {
      id: data.entryId as any,
      user_id: data.userId,
      type: data.capture.type as 'photo' | 'video' | 'audio',
      shared_with: sharedWith,
      content_url: finalContentUrl,
      text_content: data.textContent || null,
      music_tag: data.musicTag || null,
      location_tag: data.locationTag || null,
      is_private: data.isPrivate,
      shared_with_everyone: data.isEveryone,
      attachments: data.attachments,
      created_at: createdAt,
      updated_at: createdAt,
      metadata: data.capture.metadata ? JSON.parse(JSON.stringify(data.capture.metadata)) : null,
    };

    console.log('Processing new entry', newEntry);

    // Use EntryService to create the entry
    const result = await EntryService.createEntry(data.userId, newEntry);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create entry');
    }

    const entry = result.data!;

    // Update status to completed and ensure real entry replaces temp in storage
    // Ensure profile is present; fetch if needed
    let profile = (entry as any).profile;
    if (!profile) {
      try {
        const { data: profileData } = await supabase
          .from(TABLES.PROFILES)
          .select('*')
          .eq('id', data.userId)
          .single();
        profile = profileData || null;
      } catch {
        profile = null;
      }
    }

    const entryWithProfile = { ...(entry as any), profile };

    await deviceStorage.replaceEntry(
      data.userId,
      data.entryId,
      { ...entryWithProfile, status: 'completed', processingCompletedAt: new Date().toISOString() }
    );
    deviceStorage.emit('entryStatusChanged', {
      userId: data.userId,
      entryId: data.entryId,
      status: 'completed',
      entry: entryWithProfile
    });

    console.log('Entry processed successfully:', data.entryId);
    return { success: true, entry };

    console.log('Entry processed successfully:', data.entryId);
    return { success: true, entry };

  } catch (error) {
    console.error('Background processing error:', error);

    // Update status to failed
    await deviceStorage.updateEntry(data.userId, data.entryId, {
      status: 'failed',
      processingFailedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    deviceStorage.emit('entryStatusChanged', {
      userId: data.userId,
      entryId: data.entryId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Starts processing the queue in the foreground while the app is active
export async function startForegroundQueueProcessor(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    let next: EntryProcessingData | undefined;
    // eslint-disable-next-line no-constant-condition
    while ((next = await dequeueNext())) {
      try {
        logger.info('Processing entry in foreground:', next.entryId);
        await processEntry(next);
      } catch (err) {
        logger.error('Queue item processing failed, leaving as-is for retry:', err);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Schedules a background task for entry processing
 */
export async function scheduleEntryProcessing(data: EntryProcessingData): Promise<void> {
  try {
    // Check if entry with this idempotency key already exists in queue
    const queue = await loadQueue();
    const existingEntry = queue.find(item => item.idempotencyKey === data.idempotencyKey);

    if (existingEntry) {
      console.log('Entry with idempotency key already in queue, skipping duplicate:', data.idempotencyKey);
      return;
    }

    // Enqueue and kick off the foreground processor
    queue.push(data);
    await saveQueue(queue);
    console.log('Queued entry for processing:', data.entryId);

    // Mark entry as pending in storage immediately
    await deviceStorage.updateEntry(data.userId, data.entryId, {
      status: 'pending',
      processingStartedAt: null,
      processingCompletedAt: null,
      processingFailedAt: null,
      error: null
    });

    // Kick the processor
    void startForegroundQueueProcessor();

  } catch (err) {
    console.error('Failed to schedule background task:', err);

    // Update status to failed if scheduling fails
    await deviceStorage.updateEntry(data.userId, data.entryId, {
      status: 'failed',
      processingFailedAt: new Date().toISOString(),
      error: 'Failed to schedule background processing'
    });
  }
}

/**
 * Retries a failed entry processing
 */
export async function retryEntryProcessing(data: EntryProcessingData): Promise<void> {
  // Reset status to pending
  await deviceStorage.updateEntry(data.userId, data.entryId, {
    status: 'pending',
    processingStartedAt: null,
    processingCompletedAt: null,
    processingFailedAt: null,
    error: null
  });

  // Re-enqueue the task (check for duplicates)
  const queue = await loadQueue();
  const existingEntry = queue.find(item => item.idempotencyKey === data.idempotencyKey);

  if (!existingEntry) {
    queue.push(data);
    await saveQueue(queue);
    void startForegroundQueueProcessor();
  } else {
    console.log('Entry with idempotency key already in queue, skipping retry:', data.idempotencyKey);
  }
}
