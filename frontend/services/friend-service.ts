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

  /**
   * Validates email format
   */
  private static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    // RFC 5322 compliant email regex (simplified but practical)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim()) && email.length <= 254; // Max email length
  }

  /**
   * Validates phone number format
   * Accepts international format with optional + prefix and digits
   */
  private static isValidPhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    // Remove common formatting characters for validation
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    // Must start with + (optional) followed by 7-15 digits
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    return phoneRegex.test(cleaned);
  }

  /**
   * Validates UUID format (v4)
   */
  private static isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid.trim());
  }

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

      const friends: FriendWithProfile[] = data?.map(friend => {
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

      if (!data) return [];

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
      
      // Validate and filter emails
      const validEmails = (contacts
        ?.map((contact) => contact.email)
        .filter((email): email is string => Boolean(email) && typeof email === 'string')
        .filter((email) => this.isValidEmail(email)) ?? []) as string[];
      
      // Validate and filter phone numbers
      const validNumbers = (contacts
        ?.map((contact) => contact.phoneNumber)
        .filter((phone): phone is string => Boolean(phone) && typeof phone === 'string')
        .filter((phone) => this.isValidPhoneNumber(phone)) ?? []) as string[];
      
      // Early return if no valid contact data
      if (validEmails.length === 0 && validNumbers.length === 0) {
        logger.info('No valid email or phone contacts found');
        return [];
      }
    
      logger.info(`Getting retriving saved friends for ${session.user.id}`);
      const friends  = await deviceStorage.getFriends(session.user.id);
      
      // Validate and filter excluded IDs (UUIDs)
      const validExcludedIds = [
        ...(friends?.map((friend) => friend.friend_profile.id.trim()) ?? []),
        session.user.id
      ].filter((id) => this.isValidUUID(id));
      
      // Build query with validated data
      let query = supabase
        .from(TABLES.PROFILES)
        .select('id,full_name,avatar_url,username');
      
      // Only add .or() clause if we have valid contact data
      if (validEmails.length > 0 || validNumbers.length > 0) {
        const emailFilter = validEmails.length > 0 ? `email.in.(${validEmails.join(',')})` : '';
        const phoneFilter = validNumbers.length > 0 ? `phone_number.in.(${validNumbers.join(',')})` : '';
        const orClause = [emailFilter, phoneFilter].filter(Boolean).join(',');
        query = query.or(orClause);
      }
      
      // Only add .not() clause if we have valid excluded IDs
      if (validExcludedIds.length > 0) {
        query = query.not('id', 'in', `(${validExcludedIds.join(',')})`);
      }
      
      const { data, error } = await query as { data: Profile[], error: any }

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