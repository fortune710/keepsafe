import { Friend, FriendWithProfile, InviteLink, InviteResult, ShareOptions, SuggestedFriend } from '@/types/friends';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { ContactsService } from './contacts-service';
import { supabase } from '@/lib/supabase';
import { FRIENDSHIP_STATUS, TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { deviceStorage } from './device-storage';
import { generateDeepLinkUrl, generateInviteCode } from '@/lib/utils';
import { logger } from '@/lib/logger';

type Profile = Database['public']['Tables']['profiles']['Row']

export class FriendService {
  private static readonly BASE_INVITE_URL = generateDeepLinkUrl() + "/invite";

  static async generateInviteLink(): Promise<InviteResult> {
    try {
      // Generate a unique invite code
      const inviteCode = await generateInviteCode();
      
      // Create invite link
      const inviteLink: InviteLink = {
        url: `${this.BASE_INVITE_URL}/${inviteCode}`,
        code: inviteCode,
        //expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        usageCount: 0,
        maxUsage: 10,
      };

      // In a real app, you would save this to your backend
      console.log('Generated invite link:', inviteLink);

      return {
        success: true,
        message: 'Invite link generated successfully',
        inviteLink,
      };
    } catch (error) {
      console.error('Failed to generate invite link:', error);
      return {
        success: false,
        message: 'Failed to generate invite link',
      };
    }
  }

  static async copyToClipboard(text: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }

  static async shareInviteLink(options: ShareOptions): Promise<void> {
    try {
      // Check if Web Share API is available and supported
      if (!navigator.share) {
        throw new Error('SHARE_NOT_SUPPORTED');
      }

      const result = await Share.share({
        title: options.title,
        message: `${options.message}\n\n${options.url}`,
        url: options.url,
      });

      if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      } else if (result.action === Share.sharedAction) {
        console.log('Share completed');
      }
    } catch (error) {
      console.error('Failed to share invite link:', error);
      
      // Handle specific Web Share API errors
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          throw new Error('SHARE_PERMISSION_DENIED');
        } else if (error.message === 'SHARE_NOT_SUPPORTED') {
          throw new Error('SHARE_NOT_SUPPORTED');
        }
      }
      
      throw new Error('SHARE_FAILED');
    }
  }

  static async getFriends(userId: string): Promise<FriendWithProfile[]> {
    if (!userId) {
      logger.error('User ID is required to retrive friends');
      throw new Error('User ID is required');
    }

    try {
      if (__DEV__) console.log('Fetching friendships for user:', userId);

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

    } catch (error) {
      logger.error('Failed to get friends:', error);
      throw error;
    }
  }

  static async sendFriendRequest(userId: string, friendId: string): Promise<boolean> { 
    if (!userId || !friendId) {
      if (__DEV__) logger.error('User ID and friend ID are required to send a friend request', { userId, friendId });
      throw new Error('User ID and friend ID are required');
    }

    try {
      logger.info(`Sending friend request`, { userId, friendId });
      const { error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: FRIENDSHIP_STATUS.PENDING,
        } as never)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      logger.error('Failed to send friend request:', error);
      throw error;
    }
  }

  static async acceptFriendRequest(requestId: string): Promise<boolean> {
    try {
      // In a real app, this would accept the request via your backend
      console.log('Accepting friend request:', requestId);
      return true;
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      return false;
    }
  }

  static async removeFriend(friendshipId: string): Promise<boolean> {
    try {
      // In a real app, this would remove the friend via your backend
      logger.info('Removing friend record', { friendshipId });
      const { error } = await supabase
        .from(TABLES.FRIENDSHIPS)
        .delete()
        .eq('id', friendshipId);

      if (error) {
        throw new Error(error.message);
      }
      return true;
    } catch (error) {
      logger.error('Failed to remove friend record', error);
      throw error;
    }
  }

  static async getSuggestedFriendsFromContacts(): Promise<SuggestedFriend[]> {
    try {
      const savedSuggestions = await deviceStorage.getSuggestedFriends();
      if (savedSuggestions.length > 0) {
        return savedSuggestions;
      }

      await supabase.auth.refreshSession();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.error('No Active Session Found');
        throw new Error('No session found');
      }

      const contacts = await ContactsService.getDeviceContacts();
      const emails = contacts?.map((contact) => contact.email).filter(Boolean).join(",");
      const numbers = contacts?.map((contact) => !!contact.phoneNumber && contact.phoneNumber).join(",");
    
      logger.info(`Getting retriving saved friends for ${session.user.id}`);
      const friends  = await deviceStorage.getFriends(session.user.id);
      const excludedIds = friends?.map((friend) => friend.friend_profile.id.trim()) ?? [];
      excludedIds.push(session.user.id);
      
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id,full_name,avatar_url,username')
        .or(`
          email.in.(${emails}),
          phone_number.in.(${numbers})
        `.replace(/\s+/g, '')
        )
        .not('id', 'in', `(${excludedIds.join(',')})`) as { data: Profile[], error: any }

        if (error) {
          throw error;
        }
      
        const profiles: SuggestedFriend[] = data?.map((profile) => ({
          id: profile.id,
          name: profile.full_name ?? "",
          username: profile.username ?? "",
          avatar: profile.avatar_url,
        }))

        await deviceStorage.setSuggestedFriends(profiles);

        return profiles;

    } catch (error) {
      console.error('Failed to get contacts:', error);
      throw error;
    }
  }

  static formatInviteUrl(code: string): string {
    return `${this.BASE_INVITE_URL}/${code}`;
  }

  static validateInviteCode(code: string): boolean {
    return /^[A-Za-z0-9]{8}$/.test(code);
  }
}