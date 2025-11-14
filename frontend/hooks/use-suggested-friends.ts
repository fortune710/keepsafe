import { useQuery } from '@tanstack/react-query';
import { FriendService } from '@/services/friend-service';
import { SuggestedFriend } from '@/types/friends';
import { useAuthContext } from '@/providers/auth-provider';

interface UseSuggestedFriendsResult {
  suggestedFriends: SuggestedFriend[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSuggestedFriends(): UseSuggestedFriendsResult {
  const { profile } = useAuthContext();

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

  return {
    suggestedFriends,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}