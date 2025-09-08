import { Friend, InviteLink, InviteResult, ShareOptions } from '@/types/friends';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export class FriendService {
  private static readonly BASE_INVITE_URL = 'https://keepsafe.app/invite';

  static async generateInviteLink(): Promise<InviteResult> {
    try {
      // Generate a unique invite code
      const inviteCode = this.generateInviteCode();
      
      // Create invite link
      const inviteLink: InviteLink = {
        url: `${this.BASE_INVITE_URL}/${inviteCode}`,
        code: inviteCode,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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

  static async sendFriendRequest(friendId: string): Promise<boolean> {
    try {
      // In a real app, this would send a request to your backend
      console.log('Sending friend request to:', friendId);
      return true;
    } catch (error) {
      console.error('Failed to send friend request:', error);
      return false;
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

  static async removeFriend(friendId: string): Promise<boolean> {
    try {
      // In a real app, this would remove the friend via your backend
      console.log('Removing friend:', friendId);
      return true;
    } catch (error) {
      console.error('Failed to remove friend:', error);
      return false;
    }
  }

  private static generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  static formatInviteUrl(code: string): string {
    return `${this.BASE_INVITE_URL}/${code}`;
  }

  static validateInviteCode(code: string): boolean {
    return /^[A-Za-z0-9]{8}$/.test(code);
  }
}