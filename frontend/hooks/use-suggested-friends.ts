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

export function useSuggestedFriends(): UseSuggestedFriendsResult {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  const {
    data: suggestedFriends = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['suggested-friends'],
    queryFn: async () => {
      // Await the prefetch function to ensure it completes
      const contacts = await FriendService.getSuggestedFriendsFromContacts();
      return contacts.filter(contact => contact.id !== profile?.id);
    },
    enabled: !!profile?.id && profile.id !== '',
  });

  const removeContactFromList = useCallback((friendId: string) => {
    // Optimistically update TanStack Query cache
    queryClient.setQueryData<SuggestedFriend[]>(['suggested-friends'], (oldData) => {
      if (!oldData) return [];
      return oldData.filter(contact => contact.id !== friendId);
    });

    // Optimistically update local storage
    deviceStorage.getSuggestedFriends().then((storedContacts) => {
      const updatedContacts = storedContacts.filter(contact => contact.id !== friendId);
      deviceStorage.setSuggestedFriends(updatedContacts);
    }).catch((error) => {
      logger.warn('Failed to update local storage:', error);
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