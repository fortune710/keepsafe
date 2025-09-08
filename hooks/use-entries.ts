import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { MediaCapture } from '@/types/media';
import { deviceStorage } from '@/services/device-storage';

type Entry = Database['public']['Tables']['entries']['Row'];
type EntryInsert = Database['public']['Tables']['entries']['Insert'];
type EntryUpdate = Database['public']['Tables']['entries']['Update'];

interface UseEntriesResult {
  entries: Entry[];
  isLoading: boolean;
  error: Error | null;
  createEntry: (entryData: EntryInsert) => Promise<{ success: boolean; entry?: Entry; error?: string }>;
  updateEntry: (id: string, updates: EntryUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteEntry: (id: string) => Promise<{ success: boolean; error?: string }>;
  uploadMedia: (file: File, userId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  refetch: () => void;
}

export function useEntries(userId?: string): UseEntriesResult {
  const queryClient = useQueryClient();

  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['entries', userId],
    queryFn: async () => {
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

      return data;
    },
    enabled: !!userId,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (entryData: EntryInsert) => {
      const { data, error } = await supabase
        .from(TABLES.ENTRIES)
        .insert(entryData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async (newEntry) => {
      // Add to local storage immediately
      if (userId) {
        await deviceStorage.addEntry(userId, newEntry);
      }
      queryClient.invalidateQueries({ queryKey: ['entries', userId] });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EntryUpdate }) => {
      const { data, error } = await supabase
        .from(TABLES.ENTRIES)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async (updatedEntry) => {
      // Update in local storage
      if (userId) {
        await deviceStorage.updateEntry(userId, updatedEntry.id, updatedEntry);
      }
      queryClient.invalidateQueries({ queryKey: ['entries', userId] });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.ENTRIES)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: async (_, deletedId) => {
      // Remove from local storage
      if (userId) {
        await deviceStorage.removeEntry(userId, deletedId);
      }
      queryClient.invalidateQueries({ queryKey: ['entries', userId] });
    },
  });

  const createEntry = useCallback(async (entryData: EntryInsert) => {
    try {
      const entry = await createEntryMutation.mutateAsync(entryData);
      return { success: true, entry };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create entry' 
      };
    }
  }, [createEntryMutation]);

  const updateEntry = useCallback(async (id: string, updates: EntryUpdate) => {
    try {
      await updateEntryMutation.mutateAsync({ id, updates });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update entry' 
      };
    }
  }, [updateEntryMutation]);

  const deleteEntry = useCallback(async (id: string) => {
    try {
      await deleteEntryMutation.mutateAsync(id);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete entry' 
      };
    }
  }, [deleteEntryMutation]);

  const uploadMedia = useCallback(async (file: File, userId: string) => {
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

      return { success: true, url: publicUrl };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload media' 
      };
    }
  }, []);

  return {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    uploadMedia,
    refetch,
  };
}