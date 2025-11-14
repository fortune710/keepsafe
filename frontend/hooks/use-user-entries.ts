import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';
import { groupBy } from '@/lib/utils';
import { retryEntryProcessing } from '@/services/background-task-manager';
import { EntryWithProfile } from '@/types/entries';



interface UseUserEntriesResult {
  entries: EntryWithProfile[];
  entriesByDate: Record<string, EntryWithProfile[]>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasMore: boolean;
  addOptimisticEntry: (entry: EntryWithProfile) => void;
  replaceOptimisticEntry: (tempId: string, realEntry?: EntryWithProfile) => void;
  retryEntry: (entryId: string) => Promise<void>;
}

const MIN_ENTRIES_TO_CACHE = 10;

export function useUserEntries(): UseUserEntriesResult {
  const { user } = useAuthContext();
  const [hasMore, setHasMore] = useState(true);
  const [optimisticEntries, setOptimisticEntries] = useState<EntryWithProfile[]>([]);

  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Try to get cached entries first
      const cachedEntries = await deviceStorage.getEntries(user.id);
      if (cachedEntries && cachedEntries.length > MIN_ENTRIES_TO_CACHE) {
        return cachedEntries;
      }

      // First, get entries that the user created OR that are shared with everyone
      const { data: entries, error: userEntriesError }: { data: EntryWithProfile[] | null, error: any } = await supabase
        .from(TABLES.ENTRIES)
        .select(`
          *,
          profile:${TABLES.PROFILES} (
            *
          )
        `)
        .contains('shared_with', [user.id])
        .order('created_at', { ascending: false })
        .limit(20);

      if (userEntriesError || !entries) {
        throw new Error(userEntriesError.message);
      }

      
      // Cache the entries data
      if (entries?.length > MIN_ENTRIES_TO_CACHE) {
        await deviceStorage.setEntries(user.id, entries);
      }

      return entries;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 5 minutes
  });

  // Subscribe to device storage updates to keep UI in sync without manual refresh
  useEffect(() => {
    if (!user) return;
    const unsubscribe = deviceStorage.on('entriesChanged', ({ userId }: { userId: string }) => {
      if (userId === user.id) {
        refetch();
      }
    });
    return unsubscribe;
  }, [user, refetch]);

  const addOptimisticEntry = useCallback((entry: EntryWithProfile) => {
    const optimisticEntry = {
      ...entry,
      status: 'pending' as const,
    };
    
    setOptimisticEntries(prev => [optimisticEntry, ...prev]);
    
    // Also add to device storage
    if (user) {
      deviceStorage.addEntry(user.id, optimisticEntry);
    }
  }, [user]);

  const replaceOptimisticEntry = useCallback((tempId: string, realEntry?: EntryWithProfile) => {
    setOptimisticEntries(prev => {
      if (realEntry) {
        // Replace optimistic entry with real entry
        return prev.map(entry => entry.id === tempId ? { ...realEntry, status: 'completed' } : entry);
      } else {
        // Remove optimistic entry (failed save)
        return prev.filter(entry => entry.id !== tempId);
      }
    });

    // Update device storage
    if (user) {
      if (realEntry) {
        deviceStorage.replaceEntry(user.id, tempId, { ...realEntry, status: 'completed' });
      } else {
        deviceStorage.removeEntry(user.id, tempId);
      }
    }

    // Invalidate query to refetch real data
    refetch();
  }, [user, refetch]);

  const retryEntry = useCallback(async (entryId: string) => {
    if (!user) return;

    try {
      // Get the entry data from device storage
      const entries = await deviceStorage.getEntries(user.id);
      const entry = entries?.find(e => e.id === entryId);
      
      if (!entry) {
        console.error('Entry not found for retry:', entryId);
        return;
      }

      // Prepare retry data
      const retryData = {
        entryId: entry.id,
        userId: user.id,
        capture: {
          id: entry.id,
          type: entry.type,
          uri: entry.content_url,
          timestamp: new Date(entry.created_at),
          metadata: entry.metadata,
        },
        textContent: entry.text_content || '',
        musicTag: entry.music_tag,
        locationTag: entry.location_tag,
        isPrivate: entry.is_private,
        isEveryone: entry.shared_with_everyone,
        selectedFriends: entry.shared_with?.filter((id: string) => id !== user.id) || [],
        attachments: entry.attachments || [],
      };

      // Retry the processing
      await retryEntryProcessing(retryData);
      
    } catch (error) {
      console.error('Failed to retry entry:', error);
    }
  }, [user]);
  // Combine real entries with optimistic entries
  const allEntries = [...optimisticEntries, ...entries];

  return {
    entries: allEntries,
    entriesByDate: groupBy(allEntries, "created_at"),
    isLoading,
    error,
    refetch,
    hasMore,
    addOptimisticEntry,
    replaceOptimisticEntry,
    retryEntry,
  };
}