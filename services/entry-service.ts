import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { deviceStorage } from './device-storage';
import { StreakService } from './streak-service';

type Entry = Database['public']['Tables']['entries']['Row'];
type EntryInsert = Database['public']['Tables']['entries']['Insert'];
type EntryUpdate = Database['public']['Tables']['entries']['Update'];

export interface EntryServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class EntryService {
  // Fetch entries for a user
  static async getEntries(userId: string): Promise<Entry[]> {
    if (!userId) return [];

    // Try to get cached entries first
    const cachedEntries = await deviceStorage.getEntries(userId);
    if (cachedEntries && cachedEntries.length > 0) {
      return cachedEntries;
    }

    const { data, error } = await supabase
      .from(TABLES.ENTRIES)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    // Cache the entries data
    if (data && data.length > 0) {
      await deviceStorage.setEntries(userId, data);
    }

    return data || [];
  }

  // Create a new entry
  static async createEntry(userId: string, entryData: EntryInsert): Promise<EntryServiceResult<Entry>> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ENTRIES)
        .insert(entryData as any)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const entry = data as Entry;

      // Update streak tracking
      if (entry && entry.created_at) {
        try {
          const currentStreakData = await StreakService.loadStreakData(userId);
          await StreakService.updateStreak(userId, new Date(entry.created_at), currentStreakData);
        } catch (error) {
          console.error('Failed to update streak:', error);
        }
      }

      return { success: true, data: entry };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create entry'
      };
    }
  }

  // Update an existing entry
  static async updateEntry(userId: string, id: string, updates: EntryUpdate): Promise<EntryServiceResult<Entry>> {
    try {
      const { data, error } = await supabase
        .from(TABLES.ENTRIES)
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const entry = data as Entry;

      // Update in local storage
      await deviceStorage.updateEntry(userId, entry.id, entry);

      return { success: true, data: entry };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update entry'
      };
    }
  }

  // Delete an entry
  static async deleteEntry(userId: string, id: string): Promise<EntryServiceResult> {
    try {
      const { error } = await supabase
        .from(TABLES.ENTRIES)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      // Remove from local storage
      await deviceStorage.removeEntry(userId, id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete entry'
      };
    }
  }

  // Upload media file
  static async uploadMedia(file: File, userId: string): Promise<EntryServiceResult<{ url: string }>> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (error) {
        throw new Error(error.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      return { success: true, data: { url: publicUrl } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media'
      };
    }
  }

  // Add entry to local storage (for optimistic updates)
  static async addEntryToCache(userId: string, entry: Entry): Promise<void> {
    await deviceStorage.addEntry(userId, entry);
  }

  // Update entry in local storage
  static async updateEntryInCache(userId: string, entryId: string, entry: Entry): Promise<void> {
    await deviceStorage.updateEntry(userId, entryId, entry);
  }

  // Remove entry from local storage
  static async removeEntryFromCache(userId: string, entryId: string): Promise<void> {
    await deviceStorage.removeEntry(userId, entryId);
  }

  // Get cached entries
  static async getCachedEntries(userId: string): Promise<Entry[]> {
    return await deviceStorage.getEntries(userId) || [];
  }

  // Set cached entries
  static async setCachedEntries(userId: string, entries: Entry[]): Promise<void> {
    await deviceStorage.setEntries(userId, entries);
  }
}
