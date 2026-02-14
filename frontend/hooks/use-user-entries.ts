import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';
import { groupBy } from '@/lib/utils';
import { retryEntryProcessing } from '@/services/background-task-manager';
import { generateIdempotencyKey } from '@/hooks/use-entry-operations';
import { EntryWithProfile } from '@/types/entries';
import { useTimezone } from '@/hooks/use-timezone';
import { logger } from '@/lib/logger';



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
  unseenEntryIds: Set<string>;
  markEntriesAsSeen: (entryIds: string[]) => void;
}

const MIN_ENTRIES_TO_CACHE = 10;

/**
 * Gets the profile of an entry owner.
 * First checks device storage (friends) for the profile, then falls back to Supabase.
 * @param ownerUserId - The user ID of the entry owner
 * @param currentUserId - The current logged-in user's ID
 * @returns The profile object with only id, full_name, username, and avatar_url
 */
async function getEntryOwnerProfile(
  ownerUserId: string,
  currentUserId: string
): Promise<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null } | null> {
  try {
    // Helper function to fetch profile from Supabase
    const fetchFromSupabase = async () => {
      const { data: profile, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id, full_name, username, avatar_url')
        .eq('id', ownerUserId)
        .single();

      if (error || !profile) {
        console.error('Error fetching profile from Supabase:', error);
        return null;
      }

      return profile;
    };

    // First, try to get from device storage (friends)
    const friends = await deviceStorage.getFriends(currentUserId);
    if (!friends) {
      return await fetchFromSupabase();
    }

    // Find the friendship where the owner is either user_id or friend_id
    const friendship = friends.find(
      (f) => f.user_id === ownerUserId || f.friend_id === ownerUserId
    );
    
    if (!friendship?.friend_profile || friendship.friend_profile.id !== ownerUserId) {
      return await fetchFromSupabase();
    }

    // Return only the required fields from friend profile
    const profileData = friendship.friend_profile;
    return {
      id: profileData.id,
      full_name: profileData.full_name,
      username: profileData.username,
      avatar_url: profileData.avatar_url,
    };
  } catch (error) {
    console.error('Error getting entry owner profile:', error);
    return null;
  }
}

export function useUserEntries(): UseUserEntriesResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [hasMore, setHasMore] = useState(true);
  const [optimisticEntries, setOptimisticEntries] = useState<EntryWithProfile[]>([]);
  const [unseenEntryIds, setUnseenEntryIds] = useState<Set<string>>(new Set());
  const wasOfflineRef = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

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
        //.limit(20);

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

  // Mark entries as seen
  const markEntriesAsSeen = useCallback((entryIds: string[]) => {
    setUnseenEntryIds(prev => {
      const updated = new Set(prev);
      entryIds.forEach(id => updated.delete(id));
      return updated;
    });
  }, []);

  // Helper function to handle missed entries after reconnection
  const fetchMissedEntries = useCallback(async (userId: string) => {
    try {
      // Fetch entries created in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: recentEntries, error: fetchError } = await supabase
        .from(TABLES.ENTRIES)
        .select(`*, profile:${TABLES.PROFILES}(*)`)
        .contains('shared_with', [userId])
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false });

      if (fetchError || !recentEntries) {
        logger.error('Error fetching missed entries:', fetchError);
        return;
      }

      const currentEntries = queryClient.getQueryData<EntryWithProfile[]>(['user-entries', userId]) || [];
      const currentEntryIds = new Set(currentEntries.map(e => e.id));
      
      // Find entries that were missed
      const missedEntries = recentEntries.filter(
        (entry: EntryWithProfile) => 
          !currentEntryIds.has(entry.id) && entry.user_id !== userId
      );

      if (missedEntries.length > 0) {
        logger.info(`Found ${missedEntries.length} missed entries after reconnection`);
        
        // Merge missed entries with existing entries and sort by created_at descending (newest first)
        const allEntries = [...missedEntries, ...currentEntries];
        const sortedEntries = allEntries.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Descending order (newest first)
        });

        // Update cache with properly sorted entries
        queryClient.setQueryData<EntryWithProfile[]>(
          ['user-entries', userId],
          sortedEntries
        );

        // Save all entries to device storage at once (properly sorted)
        try {
          await deviceStorage.setEntries(userId, sortedEntries);
        } catch (storageError) {
          logger.error('Error saving missed entries to storage:', storageError);
        }

        // Add to unseen list
        setUnseenEntryIds(prev => {
          const updated = new Set(prev);
          missedEntries.forEach((entry: EntryWithProfile) => {
            if (updated.size < 50) {
              updated.add(entry.id);
            }
          });
          return updated;
        });
      }
    } catch (error) {
      logger.error('Error in fetchMissedEntries:', error);
    }
  }, [queryClient]);

  // Helper function to setup subscription
  const setupSubscription = useCallback((userId: string) => {
    // Clean up any existing subscription first
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    logger.info(`Setting up realtime subscription for user: ${userId}`);

    // Subscribe to entries table changes
    // Note: Supabase realtime doesn't support array contains filters directly,
    // so we listen to all INSERTs and filter in the callback to check if user.id is in shared_with array
    const channel = supabase
      .channel(`shared-entries-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.ENTRIES,
          // No filter here - we filter in the callback to check if user.id is in shared_with array
        },
        async (payload) => {
          try {
            const newEntryData = payload.new as any;
            
            // Skip own entries
            if (newEntryData.user_id === userId) return;

            // Filter: Check if entry is shared with this user
            const sharedWith = newEntryData.shared_with || [];
            const sharedWithEveryone = newEntryData.shared_with_everyone || false;
            
            // Skip if not shared with this user
            if (!sharedWithEveryone && !sharedWith.includes(userId)) {
              return;
            }

            // Get the entry owner's profile using our helper function
            const ownerProfile = await getEntryOwnerProfile(newEntryData.user_id, userId);
            
            if (!ownerProfile) {
              logger.error('Could not fetch entry owner profile');
              return;
            }

            // Combine entry with profile
            const typedNewEntry: EntryWithProfile = {
              ...(newEntryData as any),
              profile: ownerProfile,
            };

            // Deduplicate: Check if entry already exists in React Query cache
            const currentEntries: EntryWithProfile[] = queryClient.getQueryData<EntryWithProfile[]>(['user-entries', userId]) || [];
            if (currentEntries.some(e => e.id === typedNewEntry.id)) {
              logger.info('Entry already exists in cache, skipping:', typedNewEntry.id);
              return;
            }

            logger.info('New entry received via realtime:', typedNewEntry.id);

            // Update React Query cache optimistically
            queryClient.setQueryData<EntryWithProfile[]>(
              ['user-entries', userId],
              (old = []) => [typedNewEntry, ...old]
            );

            // Update device storage (with deduplication handled in addEntry)
            try {
              await deviceStorage.addEntry(userId, typedNewEntry);
            } catch (storageError) {
              logger.error('Error saving entry to device storage:', storageError);
              // Don't block - continue even if storage fails
            }

            // Track as unseen
            setUnseenEntryIds(prev => {
              const updated = new Set(prev);
              // Limit unseen entries to prevent memory issues
              if (updated.size < 50) {
                updated.add(typedNewEntry.id);
              }
              return updated;
            });
          } catch (error) {
            logger.error('Error handling realtime entry:', error);
            // Graceful degradation - don't crash the app
          }
        }
      )
      .subscribe((status) => {
        logger.info(`Realtime subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          logger.info('Successfully subscribed to shared entries');
          reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful subscription
          
          // Handle offline reconnection: fetch missed entries
          if (wasOfflineRef.current) {
            logger.info('Fetching missed entries due to offline reconnection');
            wasOfflineRef.current = false;
            fetchMissedEntries(userId);
          }
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Realtime subscription error - will attempt to reconnect');
          wasOfflineRef.current = true;
          scheduleReconnect(userId);
        } else if (status === 'TIMED_OUT') {
          logger.warn('Realtime subscription timed out - will attempt to reconnect');
          wasOfflineRef.current = true;
          scheduleReconnect(userId);
        } else if (status === 'CLOSED') {
          logger.warn('Realtime subscription closed - will attempt to reconnect');
          wasOfflineRef.current = true;
          scheduleReconnect(userId);
        }
      });

    subscriptionRef.current = channel;
  }, [queryClient, fetchMissedEntries]);

  // Helper function to schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback((userId: string) => {
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;

    logger.info(`Scheduling reconnection attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      setupSubscription(userId);
    }, delay) as unknown as number;
  }, [setupSubscription]);

  // Realtime subscription for new shared entries
  useEffect(() => {
    if (!user?.id) {
      // Clean up subscription if user logs out
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    // Setup subscription
    setupSubscription(user.id);

    return () => {
      // Cleanup: unsubscribe from channel
      if (subscriptionRef.current) {
        logger.info('Cleaning up realtime subscription');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    };
  }, [user?.id, setupSubscription]);

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

      // Generate idempotency key from entry data (same as original save)
      const idempotencyKey = await generateIdempotencyKey({
        captureUri: entry.content_url,
        userId: user.id,
        selectedFriends: entry.shared_with?.filter((id: string) => id !== user.id) || [],
        isPrivate: entry.is_private,
        isEveryone: entry.shared_with_everyone,
        attachments: entry.attachments || [],
        locationTag: entry.location_tag || undefined,
        musicTag: entry.music_tag || undefined,
        textContent: entry.text_content || '',
      });

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
        idempotencyKey,
      };

      // Retry the processing
      await retryEntryProcessing(retryData);
      
    } catch (error) {
      console.error('Failed to retry entry:', error);
    }
  }, [user]);
  
  // Get timezone utilities for date grouping
  const { getLocalDateString, isUTC } = useTimezone();
  
  // Combine real entries with optimistic entries
  const allEntries = [...optimisticEntries, ...(entries || [])];

  // Ensure entriesByDate is always an object, never undefined
  const entriesByDate = allEntries.length > 0 
    ? groupBy(allEntries, "created_at", { getLocalDateString, isUTC })
    : {};

  return {
    entries: allEntries,
    entriesByDate,
    isLoading,
    error,
    refetch,
    hasMore,
    addOptimisticEntry,
    replaceOptimisticEntry,
    retryEntry,
    unseenEntryIds,
    markEntriesAsSeen,
  };
}