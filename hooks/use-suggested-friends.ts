import { useQuery } from '@tanstack/react-query';
import { FriendService } from '@/services/friend-service';
import { SuggestedFriend } from '@/types/friends';

interface UseSuggestedFriendsResult {
  suggestedFriends: SuggestedFriend[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSuggestedFriends(): UseSuggestedFriendsResult {

  const {
    data: suggestedFriends = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['suggested-friends'],
    queryFn: async () => {
      // Await the prefetch function to ensure it completes
      return FriendService.getSuggestedFriendsFromContacts();
    },
  });

  return {
    suggestedFriends,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}