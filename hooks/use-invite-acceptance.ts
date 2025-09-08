import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES, FRIENDSHIP_STATUS } from '@/constants/supabase';
import { Database } from '@/types/database';

type Invite = Database['public']['Tables']['invites']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface InviteData {
  id: string;
  inviterName: string;
  inviterEmail: string;
  inviterAvatar: string;
  message?: string;
  isUsed: boolean;
}

export interface InviteResult {
  success: boolean;
  message: string;
  friendId?: string;
}

interface UseInviteAcceptanceResult {
  inviteData: InviteData | null;
  isLoading: boolean;
  error: string | null;
  isProcessing: boolean;
  loadInvite: (inviteId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<InviteResult>;
  declineInvite: (inviteId: string) => Promise<InviteResult>;
}

export function useInviteAcceptance(): UseInviteAcceptanceResult {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const acceptInviteMutation = useMutation({
    mutationFn: async ({ inviteId, userId }: { inviteId: string; userId: string }) => {
      // Get the invite with inviter profile
      const { data: invite, error: inviteError } = await supabase
        .from(TABLES.INVITES)
        .select(`
          *,
          inviter_profile:profiles(*)
        `)
        .eq('invite_code', inviteId)
        .eq('is_active', true)
        .single();

      if (inviteError || !invite) {
        throw new Error('Invite not found or invalid');
      }

      // Check if invite has reached max uses
      if (invite.current_uses >= invite.max_uses) {
        throw new Error('This invitation has reached its usage limit');
      }

      // Check if friendship already exists
      const { data: existingFriendship } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${invite.inviter_id}),and(user_id.eq.${invite.inviter_id},friend_id.eq.${userId})`)
        .single();

      if (existingFriendship) {
        throw new Error('You are already connected with this user');
      }

      // Create friendship with accepted status
      const { data: friendship, error: friendshipError } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .insert({
          user_id: userId,
          friend_id: invite.inviter_id,
          status: FRIENDSHIP_STATUS.ACCEPTED,
        })
        .select()
        .single();

      if (friendshipError) {
        throw new Error('Failed to create friendship');
      }

      // Update invite usage count
      const { error: updateError } = await supabase
        .from(TABLES.INVITES)
        .update({ 
          current_uses: invite.current_uses + 1,
          is_active: invite.current_uses + 1 >= invite.max_uses ? false : true
        })
        .eq('id', invite.id);

      if (updateError) {
        console.warn('Failed to update invite usage:', updateError);
      }

      return {
        friendshipId: friendship.id,
        inviterName: (invite.inviter_profile as any)?.full_name || 'Unknown User',
      };
    },
  });

  const loadInvite = useCallback(async (inviteId: string) => {
    setIsLoading(true);
    setError(null);
    setInviteData(null);

    try {
      const { data: invite, error } = await supabase
        .from(TABLES.INVITES)
        .select(`
          *,
          inviter_profile:profiles(*)
        `)
        .eq('invite_code', inviteId)
        .eq('is_active', true)
        .single();

      if (error || !invite) {
        setError('This invitation link is invalid or has expired.');
        return;
      }

      const isUsed = invite.current_uses >= invite.max_uses;

      if (isUsed) {
        setError('This invitation has already been used.');
        return;
      }

      const inviterProfile = invite.inviter_profile as any;
      
      setInviteData({
        id: invite.id,
        inviterName: inviterProfile?.full_name || 'Unknown User',
        inviterEmail: inviterProfile?.email || '',
        inviterAvatar: inviterProfile?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
        message: invite.message || undefined,
        isUsed,
      });
    } catch (err) {
      console.error('Failed to load invite:', err);
      setError('Failed to load invitation. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptInvite = useCallback(async (inviteId: string): Promise<InviteResult> => {
    setIsProcessing(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const result = await acceptInviteMutation.mutateAsync({ 
        inviteId, 
        userId: user.id 
      });

      return {
        success: true,
        message: 'Invitation accepted successfully!',
        friendId: result.friendshipId,
      };
    } catch (error) {
      console.error('Failed to accept invite:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to accept invitation. Please try again.',
      };
    } finally {
      setIsProcessing(false);
    }
  }, [acceptInviteMutation]);

  const declineInvite = useCallback(async (inviteId: string): Promise<InviteResult> => {
    setIsProcessing(true);

    try {
      // For declining, we just increment the usage count to "use up" the invite
      const { data: invite, error: inviteError } = await supabase
        .from(TABLES.INVITES)
        .select('current_uses, max_uses')
        .eq('invite_code', inviteId)
        .single();

      if (inviteError || !invite) {
        throw new Error('Invite not found');
      }

      const { error: updateError } = await supabase
        .from(TABLES.INVITES)
        .update({ 
          current_uses: invite.current_uses + 1,
          is_active: invite.current_uses + 1 >= invite.max_uses ? false : true
        })
        .eq('invite_code', inviteId);

      if (updateError) {
        throw new Error('Failed to decline invitation');
      }

      return {
        success: true,
        message: 'Invitation declined.',
      };
    } catch (error) {
      console.error('Failed to decline invite:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to decline invitation. Please try again.',
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    inviteData,
    isLoading,
    error,
    isProcessing,
    loadInvite,
    acceptInvite,
    declineInvite,
  };
}