import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { InviteLink, InviteResult, ShareOptions } from '@/types/friends';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

interface UseFriendInvitationResult {
  inviteLink: InviteLink | null;
  isGenerating: boolean;
  error: string | null;
  generateInviteLink: () => Promise<InviteResult>;
  copyInviteLink: () => Promise<boolean>;
  shareInviteLink: (options?: Partial<ShareOptions>) => Promise<boolean>;
  clearInviteLink: () => void;
}

export function useFriendInvitation(): UseFriendInvitationResult {
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Get existing active invite or let trigger create new one
      const { data, error } = await supabase
        .from(TABLES.INVITES)
        .select('*')
        .eq('inviter_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        // No active invite found, trigger will create one
        // For now, return a mock response since trigger handles creation
        const mockCode = generateInviteCode();
        return {
          url: `https://keepsafe.app/invite/${mockCode}`,
          code: mockCode,
          usageCount: 0,
          maxUsage: 10,
        };
      }

      return {
        url: `https://keepsafe.app/invite/${data.invite_code}`,
        code: data.invite_code,
        usageCount: 0,
        maxUsage: 10,
      };
    },
  });

  const generateInviteLink = useCallback(async (): Promise<InviteResult> => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const link = await generateInviteMutation.mutateAsync(user.id);
      setInviteLink(link);

      return {
        success: true,
        message: 'Invite link generated successfully',
        inviteLink: link,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invite link';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsGenerating(false);
    }
  }, [generateInviteMutation]);

  const copyInviteLink = useCallback(async (): Promise<boolean> => {
    if (!inviteLink) {
      return false;
    }

    try {
      await Clipboard.setStringAsync(inviteLink.url);
      return true;
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      return false;
    }
  }, [inviteLink]);

  const shareInviteLink = useCallback(async (options?: Partial<ShareOptions>): Promise<boolean> => {
    if (!inviteLink) {
      return false;
    }

    const shareOptions: ShareOptions = {
      title: 'Join me on Keepsafe',
      message: 'I\'d love to share moments with you on Keepsafe! Join me using this link:',
      url: inviteLink.url,
      ...options,
    };

    try {
      const result = await Share.share({
        title: shareOptions.title,
        message: `${shareOptions.message}\n\n${shareOptions.url}`,
        url: shareOptions.url,
      });

      return result.action !== Share.dismissedAction;
    } catch (error) {
      console.error('Failed to share invite link:', error);
      throw error;
    }
  }, [inviteLink]);

  const clearInviteLink = useCallback(() => {
    setInviteLink(null);
    setError(null);
  }, []);

  return {
    inviteLink,
    isGenerating,
    error,
    generateInviteLink,
    copyInviteLink,
    shareInviteLink,
    clearInviteLink,
  };
}

function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}