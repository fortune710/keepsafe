import { Database } from "./database";

export interface SuggestedFriend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  email: string;
  phone: string | null;
}

export interface Friend extends SuggestedFriend {
  email: string;
  status: 'connected' | 'pending' | 'invited';
  invitedAt?: Date;
  connectedAt?: Date;
}

export interface InviteLink {
  url: string;
  code: string;
  usageCount: number;
  maxUsage: number;
}

export interface InviteResult {
  success: boolean;
  message: string;
  inviteLink?: InviteLink;
}

export interface ShareOptions {
  message: string;
  url: string;
  title: string;
}

export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface FriendWithProfile extends Friendship {
  friend_profile: Profile;
}