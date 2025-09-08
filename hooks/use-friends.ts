import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES, FRIENDSHIP_STATUS } from '@/constants/supabase';
import { Database } from '@/types/database';
import { deviceStorage } from '@/services/device-storage';

type Friendship = Database['public']['Tables']['friendships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface FriendWithProfile extends Friendship {
  friend_profile: Profile;
}

interface UseFriendsResult {
  friends: FriendWithProfile[];
  pendingRequests: FriendWithProfile[];
  isLoading: boolean;
  error: Error | null;
  sendFriendRequest: (friendId: string) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  declineFriendRequest: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
}

export function useFriends(userId?: string): UseFriendsResult {
  const queryClient = useQueryClient();

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
      const cachedFriends = await deviceStorage.getFriends(userId);
      if (cachedFriends) {
        return cachedFriends;
      }

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend_profile:profiles (
            id
          )
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Cache the friends data
      if (data) {
        await deviceStorage.setFriends(userId, data);
      }

      return data as FriendWithProfile[];
    },
    enabled: !!userId,
  });

  const friends = friendships.filter(f => f.status === FRIENDSHIP_STATUS.ACCEPTED);
  const pendingRequests = friendships.filter(f => 
    f.status === FRIENDSHIP_STATUS.PENDING && f.friend_id === userId
  );

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { data, error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .insert({
          user_id: userId!,
          friend_id: friendId,
          status: FRIENDSHIP_STATUS.PENDING,
        })
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
    mutationFn: async ({ id, status }: { id: string; status: typeof FRIENDSHIP_STATUS.ACCEPTED | typeof FRIENDSHIP_STATUS.DECLINED }) => {
      const { data, error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .update({ status })
        .eq('id', id)
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

  return {
    friends,
    pendingRequests,
    isLoading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    refetch,
  };
}