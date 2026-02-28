import { useState, useCallback, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
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
import { Image } from 'expo-image';
import { RenderedMediaCanvasItem } from '@/types/capture';



interface UseUserEntriesResult {
  entries: EntryWithProfile[];
  entriesByDate: Record<string, EntryWithProfile[]>;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  refetch: () => void;
  loadMore: () => void;
  hasMore: boolean;
  nextCursor: string | null;
  pageSize: number;
  addOptimisticEntry: (entry: EntryWithProfile) => void;
  replaceOptimisticEntry: (tempId: string, realEntry?: EntryWithProfile) => void;
  retryEntry: (entryId: string) => Promise<void>;
  unseenEntryIds: Set<string>;
  markEntriesAsSeen: (entryIds: string[]) => void;
}



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

const DEFAULT_PAGE_SIZE = 20;

export function useUserEntries(): UseUserEntriesResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [unseenEntryIds, setUnseenEntryIds] = useState<Set<string>>(new Set());
  const wasOfflineRef = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const prefetchedUrlsRef = useRef<Set<string>>(new Set());

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['user-entries', user?.id],
    queryFn: async ({ pageParam }) => {
      if (!user) return [];

      // Try to get cached entries first for initial load
      if (!pageParam) {
        const cachedEntries = await deviceStorage.getEntries(user.id);
        // Only return cached entries immediately if we have a full page.
        // This prevents getNextPageParam from prematurely returning undefined (no more pages).
        if (cachedEntries && cachedEntries.length >= DEFAULT_PAGE_SIZE) {
          return cachedEntries;
        }
      }

      let query = supabase
        .from(TABLES.ENTRIES)
        .select(`
          *,
          profile:${TABLES.PROFILES} (
            *
          )
        `)
        .contains('shared_with', [user.id])
        .order('created_at', { ascending: false })
        .limit(DEFAULT_PAGE_SIZE);

      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data: entries, error: userEntriesError }: { data: EntryWithProfile[] | null, error: any } = await query;

      if (userEntriesError) {
        throw new Error(userEntriesError.message || 'Error fetching entries');
      }

      if (entries === null) {
        throw new Error('No entries returned from Supabase');
      }

      // Cache the data. DeviceStorage now handles merging local-only entries.
      if (!pageParam && entries) {
        await deviceStorage.setEntries(user.id, entries);
        // Get the merged set from storage to ensure local-only entries are visible
        const mergedEntries = await deviceStorage.getEntries(user.id) || entries;

        logger.info(`Vault Sync: Server returned ${entries.length}, local merged total ${mergedEntries.length}`);

        // IMPORTANT: Return exactly the page size to maintain correct pagination offsets
        // and avoid double-counting or skipped entries on next page fetch.
        return mergedEntries.slice(0, DEFAULT_PAGE_SIZE);
      }



      return entries;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: EntryWithProfile[]) => {
      if (!lastPage || lastPage.length < DEFAULT_PAGE_SIZE) {
        return undefined;
      }
      return lastPage[lastPage.length - 1].created_at;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const entries = data?.pages.flat() || [];
  const lastPage = data?.pages[data.pages.length - 1];
  const nextCursor = lastPage ? lastPage.slice(-1)[0]?.created_at || null : null;
  const hasMore = !!hasNextPage;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  // Preload images for better UX
  useEffect(() => {
    if (!entries || entries.length === 0) return;

    const urlsToPreload: string[] = [];

    entries.forEach(entry => {
      // Preload main content
      if (entry.content_url && entry.type === 'image' && !prefetchedUrlsRef.current.has(entry.content_url)) {
        urlsToPreload.push(entry.content_url);
      }

      // Preload profile avatar
      if (entry.profile?.avatar_url && !prefetchedUrlsRef.current.has(entry.profile.avatar_url)) {
        urlsToPreload.push(entry.profile.avatar_url);
      }

      // Preload stickers from attachments
      if (Array.isArray(entry.attachments)) {
        (entry.attachments as RenderedMediaCanvasItem[]).forEach(attachment => {
          if (attachment.type === 'sticker' && attachment.sticker && !prefetchedUrlsRef.current.has(attachment.sticker)) {
            urlsToPreload.push(attachment.sticker);
          }
        });
      }
    });

    if (urlsToPreload.length > 0) {
      // Unique URLs only
      const uniqueUrls = Array.from(new Set(urlsToPreload));

      // Update tracking to avoid repeated work
      uniqueUrls.forEach(url => { prefetchedUrlsRef.current.add(url); });

      // Prevent unbounded memory growth by limiting set size (LRU-ish)
      if (prefetchedUrlsRef.current.size > 1000) {
        const urlArray = Array.from(prefetchedUrlsRef.current);
        prefetchedUrlsRef.current = new Set(urlArray.slice(-800));
      }

      // Preload in background
      Image.prefetch(uniqueUrls);
      logger.info(`Preloaded ${uniqueUrls.length} new images for vault`);
    }
  }, [entries]);

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

      const infiniteData = queryClient.getQueryData<InfiniteData<EntryWithProfile[]>>(['user-entries', userId]);
      const currentEntries = infiniteData?.pages.flat() || [];
      const currentEntryIds = new Set(currentEntries.map(e => e.id));

      // Find entries that were missed
      const missedEntries = recentEntries.filter(
        (entry: EntryWithProfile) =>
          !currentEntryIds.has(entry.id) && entry.user_id !== userId
      );

      if (missedEntries.length > 0) {
        logger.info(`Found ${missedEntries.length} missed entries after reconnection`);

        // Sort only the new entries if we want to prepend, or merge all and sort
        // For simplicity and correct visual order, we prepend them to the first page
        queryClient.setQueryData<InfiniteData<EntryWithProfile[]>>(
          ['user-entries', userId],
          (oldData) => {
            if (!oldData) return undefined;

            const firstPage = [...missedEntries, ...oldData.pages[0]];
            const sortedFirstPage = firstPage.sort((a, b) => {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              return dateB - dateA;
            });

            return {
              ...oldData,
              pages: [sortedFirstPage, ...oldData.pages.slice(1)],
            };
          }
        );

        // Update entries for device storage (full set)
        const updatedAllEntries = [...missedEntries, ...currentEntries].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Save all entries to device storage at once (properly sorted)
        try {
          await deviceStorage.setEntries(userId, updatedAllEntries);
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
    const channel = supabase
      .channel(`entries-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: TABLES.ENTRIES,
        },
        async (payload) => {
          try {
            if (payload.eventType === 'DELETE') {
              const oldEntry = payload.old as any;
              queryClient.setQueryData<InfiniteData<EntryWithProfile[]>>(
                ['user-entries', userId],
                (oldData) => {
                  if (!oldData) return undefined;
                  return {
                    ...oldData,
                    pages: oldData.pages.map(page => page.filter(e => e.id !== oldEntry.id)),
                  };
                }
              );
              await deviceStorage.removeEntry(userId, oldEntry.id);
              return;
            }

            const entryData = payload.new as any;
            const isOwnEntry = entryData.user_id === userId;

            // Filter: Check if entry is shared with this user (if not own entry)
            if (!isOwnEntry) {
              const sharedWith = entryData.shared_with || [];
              const sharedWithEveryone = entryData.shared_with_everyone || false;
              if (!sharedWithEveryone && !sharedWith.includes(userId)) {
                return;
              }
            }

            // Get profile
            let ownerProfile: any;
            if (isOwnEntry) {
              // Try to get own profile from device storage first, fallback to Supabase
              const profile = await deviceStorage.getItem<any>(`profile_${userId}`);
              if (profile) {
                ownerProfile = profile;
              } else {
                const { data: serverProfile } = await supabase.from(TABLES.PROFILES).select('*').eq('id', userId).single();
                ownerProfile = serverProfile;
              }
            } else {
              ownerProfile = await getEntryOwnerProfile(entryData.user_id, userId);
            }

            if (!ownerProfile) return;

            const typedEntry: EntryWithProfile = {
              ...entryData,
              profile: ownerProfile,
              status: 'completed' // Server items are always 'completed'
            };

            logger.info(`Realtime ${payload.eventType} for entry:`, typedEntry.id);

            queryClient.setQueryData<InfiniteData<EntryWithProfile[]>>(
              ['user-entries', userId],
              (oldData) => {
                if (!oldData) return undefined;

                const exists = oldData.pages.some(page => page.some(e => e.id === typedEntry.id));

                if (exists) {
                  // Replace existing entry
                  return {
                    ...oldData,
                    pages: oldData.pages.map(page =>
                      page.map(e => e.id === typedEntry.id ? typedEntry : e)
                    ),
                  };
                } else if (payload.eventType === 'INSERT') {
                  // Prepend new entry
                  return {
                    ...oldData,
                    pages: [[typedEntry, ...oldData.pages[0]], ...oldData.pages.slice(1)],
                  };
                }
                return oldData;
              }
            );

            // Update local storage - always use replaceEntry to handle both new and existing (optimistic) items
            await deviceStorage.replaceEntry(userId, typedEntry.id, typedEntry);

            if (payload.eventType === 'INSERT' && !isOwnEntry) {
              setUnseenEntryIds(prev => {
                const updated = new Set(prev);
                if (updated.size < 50) updated.add(typedEntry.id);
                return updated;
              });
            }
          } catch (error) {
            logger.error('Error handling realtime entry:', error);
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

  // Listen for background processing status changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = deviceStorage.on('entryStatusChanged', ({
      userId,
      entryId,
      status,
      entry,
      error
    }: {
      userId: string;
      entryId: string;
      status: string;
      entry?: EntryWithProfile;
      error?: string;
    }) => {
      if (userId !== user.id) return;

      logger.info(`Vault: Entry status changed to ${status}`, { entryId });

      // Update React Query cache directly instead of a full refetch
      queryClient.setQueryData<InfiniteData<EntryWithProfile[]>>(
        ['user-entries', user.id],
        (oldData) => {
          if (!oldData) return undefined;

          const newPages = oldData.pages.map(page =>
            page.map(item => {
              if (item.id === entryId) {
                // Return updated item
                if (status === 'completed' && entry) {
                  return { ...entry, status: 'completed' as const };
                }
                return { ...item, status: status as any, error: error || item.error };
              }
              return item;
            })
          );

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
    });

    return unsubscribe;
  }, [user, queryClient]);

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
      prefetchedUrlsRef.current.clear();
    };
  }, [user?.id, setupSubscription]);

  const addOptimisticEntry = useCallback(async (entry: EntryWithProfile) => {
    const optimisticEntry = {
      ...entry,
      status: 'pending' as const,
    };

    logger.info('Vault: Adding optimistic entry', { id: entry.id });

    // Single source of truth: Device Storage
    if (user) {
      await deviceStorage.addEntry(user.id, optimisticEntry);
      // Invalidate to let storage sync with UI
      queryClient.invalidateQueries({ queryKey: ['user-entries', user.id] });
    }
  }, [user, queryClient]);

  const replaceOptimisticEntry = useCallback(async (tempId: string, realEntry?: EntryWithProfile) => {
    logger.info('Vault: Replacing optimistic entry', { tempId, action: realEntry ? 'with real' : 'removing' });

    // Update device storage
    if (user) {
      if (realEntry) {
        await deviceStorage.replaceEntry(user.id, tempId, { ...realEntry, status: 'completed' });
      } else {
        await deviceStorage.removeEntry(user.id, tempId);
      }

      // Thoroughly invalidate to ensure 'completed' state reflects immediately
      queryClient.invalidateQueries({ queryKey: ['user-entries', user.id] });
    }
  }, [user, queryClient]);

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
  const allEntries = entries || [];

  // Ensure entriesByDate is always an object, never undefined
  const entriesByDate = allEntries.length > 0
    ? groupBy(allEntries, "created_at", { getLocalDateString, isUTC })
    : {};

  return {
    entries: allEntries,
    entriesByDate,
    isLoading,
    isFetchingNextPage,
    error,
    refetch,
    loadMore,
    hasMore,
    nextCursor,
    pageSize: DEFAULT_PAGE_SIZE,
    addOptimisticEntry,
    replaceOptimisticEntry,
    retryEntry,
    unseenEntryIds,
    markEntriesAsSeen,
  };
}