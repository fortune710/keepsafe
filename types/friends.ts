export interface SuggestedFriend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
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