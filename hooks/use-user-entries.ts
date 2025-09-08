import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';

type Entry = Database['public']['Tables']['entries']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface EntryWithProfile extends Entry {
  profile: Profile;
}

interface UseUserEntriesResult {
  entries: EntryWithProfile[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasMore: boolean;
  addOptimisticEntry: (entry: EntryWithProfile) => void;
  replaceOptimisticEntry: (tempId: string, realEntry?: EntryWithProfile) => void;
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

  const addOptimisticEntry = useCallback((entry: EntryWithProfile) => {
    setOptimisticEntries(prev => [entry, ...prev]);
    
    // Also add to device storage
    if (user) {
      deviceStorage.addEntry(user.id, entry);
    }
  }, [user]);

  const replaceOptimisticEntry = useCallback((tempId: string, realEntry?: EntryWithProfile) => {
    setOptimisticEntries(prev => {
      if (realEntry) {
        // Replace optimistic entry with real entry
        return prev.map(entry => entry.id === tempId ? realEntry : entry);
      } else {
        // Remove optimistic entry (failed save)
        return prev.filter(entry => entry.id !== tempId);
      }
    });

    // Update device storage
    if (user) {
      if (realEntry) {
        deviceStorage.updateEntry(user.id, tempId, realEntry);
      } else {
        deviceStorage.removeEntry(user.id, tempId);
      }
    }

    // Invalidate query to refetch real data
    refetch();
  }, [user, refetch]);
  // Combine real entries with optimistic entries
  const allEntries = [...optimisticEntries, ...entries];

  return {
    entries: allEntries,
    isLoading,
    error,
    refetch,
    hasMore,
    addOptimisticEntry,
    replaceOptimisticEntry,
  };
}