export interface InviteData {
  id: string;
  inviterName: string;
  inviterEmail: string;
  inviterAvatar: string;
  message?: string;
  isUsed: boolean;
  createdAt: Date;
}

export interface InviteResult {
  success: boolean;
  message: string;
  friendId?: string;
  error?: string;
}

export interface InviteValidationResult {
  isValid: boolean;
  reason?: 'used' | 'not_found' | 'invalid_format';
  message?: string;
}

export interface CreateInviteRequest {
  message?: string;
  maxUses?: number;
}

export interface CreateInviteResponse {
  success: boolean;
  inviteId?: string;
  inviteUrl?: string;
  message: string;
}