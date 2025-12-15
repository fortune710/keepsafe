import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES, FRIENDSHIP_STATUS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { deviceStorage } from '@/services/device-storage';
import { FriendService } from '@/services/friend-service';
import { useAuthContext } from '@/providers/auth-provider';

type Friendship = Database['public']['Tables']['friendships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface FriendWithProfile extends Friendship {
  friend_profile: Profile;
}

interface UseFriendsResult {
  friends: FriendWithProfile[];
  pendingRequests: FriendWithProfile[];
  blockedFriends: FriendWithProfile[];
  isLoading: boolean;
  error: Error | null;
  sendFriendRequest: (friendId: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  declineFriendRequest: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  blockFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
   unblockFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
  prefetchSuggestedFriends: () => Promise<{ success: boolean; error: string | null }>;
}

export function useFriends(userId?: string): UseFriendsResult {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  const {
    data: friendships = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['friendships', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Try to get cached friends first
      // const cachedFriends = await deviceStorage.getFriends(userId);
      // if (cachedFriends) {
      //   return cachedFriends;
      // }

      const { data, error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .select(`
          *,
          user_profile:profiles!friendships_user_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          friend_profile:profiles!friendships_friend_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        //.eq('friend_id', userId)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .order('created_at', { ascending: false }) as {
          data: any[],
          error: any,
        };

      const friends: FriendWithProfile[] = data.map(friend => {
        const { 
          user_profile: user, 
          friend_profile: friend_, 
          ...friend_record 
        } = friend;

        const profile = friend.friend_id === userId ? 
        user : friend_;

        return {
          ...friend_record,
          friend_profile: profile
        }

      })

      if (error) {
        throw new Error(error.message);
      }

      // Cache the friends data
      if (data) {
        await deviceStorage.setFriends(userId, friends);
      }

      return friends as FriendWithProfile[];
    },
    enabled: !!userId,
  });

  const friends = friendships.filter(f => f.status === FRIENDSHIP_STATUS.ACCEPTED);
  const pendingRequests = friendships.filter(f => 
    f.status === FRIENDSHIP_STATUS.PENDING && f.friend_id === userId
  );
  const blockedFriends = friendships.filter(f => f.status === FRIENDSHIP_STATUS.BLOCKED);

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { data, error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .insert({
          user_id: userId!,
          friend_id: friendId,
          status: FRIENDSHIP_STATUS.PENDING,
        } as never)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      // Clear cached friends to force refresh
      if (userId) {
        deviceStorage.removeItem(`friends_${userId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['friendships', userId] });
    },
  });

  const updateFriendshipMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: typeof FRIENDSHIP_STATUS.ACCEPTED | typeof FRIENDSHIP_STATUS.DECLINED | typeof FRIENDSHIP_STATUS.BLOCKED }) => {
      if (__DEV__) console.log('Updating friendship:', { id, status });

      const { error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .update({ status } as never)
        .eq('id', id);
        
      if (error) {
        if (__DEV__) console.error('Error updating friendship:', error);
        throw new Error(error.message);
      }

      if (__DEV__) console.log('Updated friendship status successfully');
      return { id, status };
    },
    onSuccess: async () => {
      // Clear cached friends to force refresh
      if (userId) {
        await deviceStorage.removeItem(`friends_${userId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['friendships', userId] });
    },
  });

  const deleteFriendshipMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      // Clear cached friends to force refresh
      if (userId) {
        await deviceStorage.removeItem(`friends_${userId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['friendships', userId] });
    },
  });

  const sendFriendRequest = useCallback(async (friendId: string) => {
    try {
      await sendFriendRequestMutation.mutateAsync(friendId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send friend request' 
      };
    }
  }, [sendFriendRequestMutation]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      await updateFriendshipMutation.mutateAsync({ id: friendshipId, status: FRIENDSHIP_STATUS.ACCEPTED });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept friend request' 
      };
    }
  }, [updateFriendshipMutation]);

  const declineFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      await updateFriendshipMutation.mutateAsync({ id: friendshipId, status: FRIENDSHIP_STATUS.DECLINED });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to decline friend request' 
      };
    }
  }, [updateFriendshipMutation]);

  const blockFriend = useCallback(async (friendshipId: string) => {
    try {
      await updateFriendshipMutation.mutateAsync({ id: friendshipId, status: FRIENDSHIP_STATUS.BLOCKED });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to block friend',
      };
    }
  }, [updateFriendshipMutation]);

  const unblockFriend = useCallback(async (friendshipId: string) => {
    try {
      await updateFriendshipMutation.mutateAsync({ id: friendshipId, status: FRIENDSHIP_STATUS.ACCEPTED });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unblock friend',
      };
    }
  }, [updateFriendshipMutation]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    try {
      await deleteFriendshipMutation.mutateAsync(friendshipId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove friend' 
      };
    }
  }, [deleteFriendshipMutation]);

  const prefetchSuggestedFriends = async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ["suggested-friends"],
        queryFn: async () => {
          const contacts = await FriendService.getSuggestedFriendsFromContacts();
          console.log({ contacts });
          return contacts.filter(contact => contact.id !== profile?.id);
        },
      })

      return {
        success: true,
        error: null
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error getting suggested friends'
      }
    }
  }
  return {
    friends,
    pendingRequests,
    blockedFriends,
    isLoading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockFriend,
    unblockFriend,
    refetch,
    prefetchSuggestedFriends
  };
}