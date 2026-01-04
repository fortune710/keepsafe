import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES, FRIENDSHIP_STATUS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { deviceStorage } from '@/services/device-storage';
import { FriendService } from '@/services/friend-service';
import { useAuthContext } from '@/providers/auth-provider';
import { posthog } from '@/constants/posthog';
import { FriendWithProfile } from '@/types/friends';





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
      return await FriendService.getFriends(userId!);
    },
    enabled: !!userId,
  });

  const friends = friendships.filter(f => f.status === FRIENDSHIP_STATUS.ACCEPTED);
  const pendingRequests = friendships.filter(f => 
    f.status === FRIENDSHIP_STATUS.PENDING && f.friend_id === userId
  );
  const blockedFriends = friendships.filter(f => 
    f.status === FRIENDSHIP_STATUS.BLOCKED && f.blocked_by === userId
  );

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return await FriendService.sendFriendRequest(userId!, friendId);
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
    mutationFn: async ({ id, status, blocked_by }: { id: string; status: typeof FRIENDSHIP_STATUS.ACCEPTED | typeof FRIENDSHIP_STATUS.DECLINED | typeof FRIENDSHIP_STATUS.BLOCKED; blocked_by?: string | null }) => {
      if (__DEV__) console.log('Updating friendship:', { id, status, blocked_by });

      const updateData: any = { status };
      if (blocked_by !== undefined) {
        updateData.blocked_by = blocked_by;
      }

      const { error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .update(updateData as never)
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
      return await FriendService.removeFriend(id);
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
    // Guard: ensure userId is present before proceeding
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required to block a friend',
      };
    }

    try {
      await updateFriendshipMutation.mutateAsync({ 
        id: friendshipId, 
        status: FRIENDSHIP_STATUS.BLOCKED,
        blocked_by: userId
      });
      try {
        // Omitting friendship_id for privacy compliance
        posthog.capture('friend_blocked', {});
      } catch (error) {
        if (__DEV__) console.warn('Analytics capture failed:', error);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to block friend',
      };
    }
  }, [updateFriendshipMutation, userId]);

  const unblockFriend = useCallback(async (friendshipId: string) => {
    try {
      await updateFriendshipMutation.mutateAsync({ 
        id: friendshipId, 
        status: FRIENDSHIP_STATUS.ACCEPTED,
        blocked_by: null
      });
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

  const prefetchSuggestedFriends = useCallback(async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ["suggested-friends"],
        queryFn: async () => {
          const contacts = await FriendService.getSuggestedFriendsFromContacts();
          console.log({ contacts });
          return contacts.filter(contact => contact.id !== profile?.id);
        }
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
  }, [queryClient, profile?.id])
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