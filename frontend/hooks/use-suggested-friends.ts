import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FriendService } from '@/services/friend-service';
import { SuggestedFriend } from '@/types/friends';
import { useAuthContext } from '@/providers/auth-provider';
import { deviceStorage } from '@/services/device-storage';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UseSuggestedFriendsResult {
  suggestedFriends: SuggestedFriend[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  removeContactFromList: (friendId: string) => void;
}

/**
 * Custom hook to manage suggested friends fetching and storage sync.
 * Uses React Query for state management and device storage for persistence.
 */
export function useSuggestedFriends(): UseSuggestedFriendsResult {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  // Fetch initial data from device storage
  const { data: storedData } = useQuery({
    queryKey: ['suggested-friends-storage', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const storedFriends = await deviceStorage.getSuggestedFriends();
        return storedFriends.filter(contact => contact.id !== profile.id);
      } catch (error) {
        logger.warn('Failed to load initial suggested friends from storage:', error);
        return [];
      }
    },
    enabled: !!profile?.id,
  });

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
      }

      return filteredContacts;
    },
    enabled: !!profile?.id && profile.id !== '',
    placeholderData: storedData,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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