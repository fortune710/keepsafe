import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  inviteData: InviteData | undefined | null;
  isLoading: boolean;
  error: string | null;
  isProcessing: boolean;
  acceptInvite: (inviteeId: string, userId: string) => Promise<InviteResult>;
  declineInvite: (inviteId: string) => Promise<InviteResult>;
}

export function useInviteAcceptance(inviteId?: string): UseInviteAcceptanceResult {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const acceptInviteMutation = useMutation({
    mutationFn: async ({ inviteeId, userId }: { inviteeId: string; userId: string }) => {
      const { data: existingFriendship } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${inviteeId}),and(user_id.eq.${inviteeId},friend_id.eq.${userId})`)
        .single();

      if (existingFriendship) {
        throw new Error('You are already connected with this user');
      }

      

      // Create friendship with accepted status
      const { data: friendship, error: friendshipError } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .insert({
          user_id: userId,
          friend_id: inviteeId,
          status: FRIENDSHIP_STATUS.ACCEPTED,
        } as never)
        .select()
        .single();

      if (friendshipError) {
        throw new Error('Failed to create friendship');
      }

      return {
        friendshipId: (friendship as any).id,
        inviterName: 'Unknown User',
      };
    },
  });

  const loadInvite = async () => {
    if (!inviteId) return;

    try {
      const { data: invite, error } = await supabase
        .from(TABLES.INVITES)
        .select('*, profile:profiles (id, email, full_name, avatar_url, username)')
        .eq('invite_code', inviteId.trim())
        .single();
    
      if (error) {
        setError('This invitation link is invalid or has expired.');
        return null;
      }

      //const isUsed = invite.current_uses >= invite.max_uses;
      /*
      if (isUsed) {
        setError('This invitation has already been used.');
        return;
      }*/

      const inviterProfile = (invite as any).profile;

      
      return {
        id: inviterProfile.id,
        inviterName: inviterProfile?.full_name || 'Unknown User',
        inviterEmail: inviterProfile?.email || '',
        inviterAvatar: inviterProfile?.avatar_url || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
        message: "",
        isUsed: false,
      };
    } catch (err) {
      console.error('Failed to load invite:', err);
      setError('Failed to load invitation. Please check your connection and try again.');
    }
  };

  const { isLoading, data: inviteData } = useQuery({
    queryKey: ["inviter-profile", inviteId],
    enabled: !!inviteId,
    queryFn: loadInvite
  })

  const acceptInvite = useCallback(async (inviteeId: string, userId: string): Promise<InviteResult> => {
    setIsProcessing(true);

    try {

      const result = await acceptInviteMutation.mutateAsync({ 
        inviteeId: inviteeId, 
        userId: userId 
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
    acceptInvite,
    declineInvite,
  };
}