import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FriendService } from '@/services/friend-service';
import { SuggestedFriend } from '@/types/friends';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';
import { useCallback, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface UseSuggestedFriendsResult {
  suggestedFriends: SuggestedFriend[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  removeContactFromList: (friendId: string) => void;
}

export function useSuggestedFriends(): UseSuggestedFriendsResult {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const [initialData, setInitialData] = useState<SuggestedFriend[] | undefined>(undefined);

  // Load initial data from device storage for instant UI
  useEffect(() => {
    if (!profile?.id) return;
    
    deviceStorage.getSuggestedFriends()
      .then((storedFriends) => {
        const filtered = storedFriends.filter(contact => contact.id !== profile.id);
        setInitialData(filtered);
      })
      .catch((error) => {
        logger.warn('Failed to load initial suggested friends from storage:', error);
        setInitialData([]);
      });
  }, [profile?.id]);

  const {
    data: suggestedFriends = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['suggested-friends'],
    queryFn: async () => {
      // Always fetch fresh data from API
      const contacts = await FriendService.getSuggestedFriendsFromContacts();
      const filteredContacts = contacts.filter(contact => contact.id !== profile?.id);
      
      // Sync device storage after successful fetch
      try {
        await deviceStorage.setSuggestedFriends(filteredContacts);
      } catch (storageError) {
        logger.warn('Failed to sync suggested friends to device storage:', storageError);
        // Don't throw - storage sync failure shouldn't break the query
      }
      
      return filteredContacts;
    },
    enabled: !!profile?.id && profile.id !== '' && initialData !== undefined,
    initialData: initialData, // Use device storage data for instant UI
    staleTime: 0, // Always consider stale, fetch fresh on mount/refocus
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus (web)
  });

  const removeContactFromList = useCallback((friendId: string) => {
    // Optimistically update React Query cache immediately
    queryClient.setQueryData<SuggestedFriend[]>(['suggested-friends'], (oldData) => {
      if (!oldData) return [];
      const updated = oldData.filter(contact => contact.id !== friendId);
      
      // Sync device storage optimistically
      deviceStorage.setSuggestedFriends(updated).catch((error) => {
        logger.warn('Failed to update device storage optimistically:', error);
      });
      
      return updated;
    });
  }, [queryClient]);

  return {
    suggestedFriends,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
    removeContactFromList,
  };
}