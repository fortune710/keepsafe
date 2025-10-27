import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/database';
import { EntryService, EntryServiceResult } from '@/services/entry-service';

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
      return await EntryService.getEntries(userId);
    },
    enabled: !!userId,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (entryData: EntryInsert) => {
      if (!userId) throw new Error('User ID is required');
      const result = await EntryService.createEntry(userId, entryData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create entry');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', userId] });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EntryUpdate }) => {
      if (!userId) throw new Error('User ID is required');
      const result = await EntryService.updateEntry(userId, id, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update entry');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', userId] });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User ID is required');
      const result = await EntryService.deleteEntry(userId, id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete entry');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', userId] });
    },
  });

  const createEntry = useCallback(async (entryData: EntryInsert) => {
    if (!userId) {
      return { 
        success: false, 
        error: 'User ID is required' 
      };
    }

    try {
      const result = await EntryService.createEntry(userId, entryData);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['entries', userId] });
      }
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create entry' 
      };
    }
  }, [userId, queryClient]);

  const updateEntry = useCallback(async (id: string, updates: EntryUpdate) => {
    if (!userId) {
      return { 
        success: false, 
        error: 'User ID is required' 
      };
    }

    try {
      const result = await EntryService.updateEntry(userId, id, updates);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['entries', userId] });
      }
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update entry' 
      };
    }
  }, [userId, queryClient]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) {
      return { 
        success: false, 
        error: 'User ID is required' 
      };
    }

    try {
      const result = await EntryService.deleteEntry(userId, id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['entries', userId] });
      }
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete entry' 
      };
    }
  }, [userId, queryClient]);

  const uploadMedia = useCallback(async (file: File, userId: string) => {
    try {
      const result = await EntryService.uploadMedia(file, userId);
      return {
        success: result.success,
        url: result.data?.url,
        error: result.error
      };
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