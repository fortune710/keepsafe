import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { InviteLink, InviteResult, ShareOptions } from '@/types/friends';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { generateDeepLinkUrl } from '@/lib/utils';

interface UseFriendInvitationResult {
  inviteLink: string;
  copyInviteLink: () => Promise<boolean>;
  shareInviteLink: (options?: Partial<ShareOptions>) => Promise<boolean>;
}

export function useFriendInvitation(): UseFriendInvitationResult {
  const { profile } = useAuthContext();
  const baseUrl = generateDeepLinkUrl();
  const inviteLink = `${baseUrl}/invite/${profile?.invite_code}`


  const copyInviteLink = useCallback(async (): Promise<boolean> => {
    if (!inviteLink) {
      return false;
    }

    try {
      await Clipboard.setStringAsync(inviteLink);
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
      url: inviteLink,
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


  return {
    inviteLink,
    copyInviteLink,
    shareInviteLink,
  };
}