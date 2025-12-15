// Supabase Database Constants

// Table Names
export const TABLES = {
  PROFILES: 'profiles',
  ENTRIES: 'entries',
  FRIENDSHIPS: 'friendships',
  ENTRY_SHARES: 'entry_shares',
  INVITES: 'invites',
  ENTRY_REACTIONS: 'entry_reactions',
  ENTRY_COMMENTS: 'entry_comments',
  PUSH_TOKENS: 'push_tokens',
  NOTIFICATION_SETTINGS: 'notification_settings',
  PRIVACY_SETTINGS: 'privacy_settings',
} as const;

// Storage Bucket Names
export const STORAGE_BUCKETS = {
  MEDIA: 'media',
  AVATARS: 'avatars',
} as const;

// Entry Types
export const ENTRY_TYPES = {
  PHOTO: 'photo',
  VIDEO: 'video',
  AUDIO: 'audio',
} as const;

// Friendship Status
export const FRIENDSHIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  BLOCKED: 'blocked',
} as const;

// File Upload Paths
export const UPLOAD_PATHS = {
  MEDIA: (userId: string, fileName: string) => `${userId}/media/${fileName}`,
  AVATARS: (userId: string, fileName: string) => `${userId}/${fileName}`,
} as const;

// Database Schema Structure
export const SCHEMA = {
  PROFILES: {
    id: 'uuid PRIMARY KEY REFERENCES auth.users(id)',
    email: 'text UNIQUE NOT NULL',
    full_name: 'text',
    username: 'text UNIQUE',
    avatar_url: 'text',
    bio: 'text',
    created_at: 'timestamptz DEFAULT now()',
    updated_at: 'timestamptz DEFAULT now()',
  },
  ENTRIES: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    user_id: 'uuid REFERENCES profiles(id) NOT NULL',
    type: 'entry_type NOT NULL',
    shared_with: 'varchar[]',
    content_url: 'text',
    text_content: 'text',
    music_tag: 'text',
    location_tag: 'text',
    is_private: 'boolean DEFAULT false',
    shared_with_everyone: 'boolean DEFAULT false',
    metadata: 'jsonb',
    created_at: 'timestamptz DEFAULT now()',
    updated_at: 'timestamptz DEFAULT now()',
    
  },
  FRIENDSHIPS: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    user_id: 'uuid REFERENCES profiles(id) NOT NULL',
    friend_id: 'uuid REFERENCES profiles(id) NOT NULL',
    status: 'friendship_status DEFAULT pending',
    created_at: 'timestamptz DEFAULT now()',
    updated_at: 'timestamptz DEFAULT now()',
  },
  ENTRY_SHARES: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    entry_id: 'uuid REFERENCES entries(id) NOT NULL',
    shared_with_user_id: 'uuid REFERENCES profiles(id) NOT NULL',
    created_at: 'timestamptz DEFAULT now()',
  },
  INVITES: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    inviter_id: 'uuid REFERENCES profiles(id) NOT NULL',
    invite_code: 'text UNIQUE NOT NULL',
    message: 'text',
    expires_at: 'timestamptz NOT NULL',
    max_uses: 'integer DEFAULT 10',
    current_uses: 'integer DEFAULT 0',
    is_active: 'boolean DEFAULT true',
    created_at: 'timestamptz DEFAULT now()',
  },
  PUSH_TOKENS: {
    id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    user_id: 'uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE',
    token: 'text NOT NULL',
    platform: "text CHECK (platform IN ('ios', 'android', 'web'))",
    device_id: 'text',
    created_at: 'timestamptz DEFAULT now()',
    updated_at: 'timestamptz DEFAULT now()',
  },
  NOTIFICATION_SETTINGS: {
    id: 'bigserial PRIMARY KEY',
    user_id: 'uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE',
    friend_requests: 'boolean NOT NULL DEFAULT true',
    push_notifications: 'boolean NOT NULL DEFAULT true',
    entry_reminder: 'boolean NOT NULL DEFAULT false',
    friend_activity: 'boolean NOT NULL DEFAULT true',
    created_at: 'timestamptz DEFAULT now()',
    updated_at: 'timestamptz DEFAULT now()',
  },
  PRIVACY_SETTINGS: {
    id: 'bigserial PRIMARY KEY',
    user_id: 'uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE',
    auto_share: 'boolean NOT NULL DEFAULT false',
    location_share: 'boolean NOT NULL DEFAULT true',
    created_at: 'timestamptz DEFAULT now()',
    updated_at: 'timestamptz DEFAULT now()',
  }
} as const;