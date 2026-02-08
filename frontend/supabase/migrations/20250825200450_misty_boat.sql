/*
  # Initial Schema Setup for Keepsafe App

  1. New Tables
    - `profiles` - User profile information
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `username` (text, unique, nullable)
      - `avatar_url` (text, nullable)
      - `bio` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `entries` - User media entries (photos, videos, audio)
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `type` (enum: photo, video, audio)
      - `content_url` (text, nullable - URL to stored media)
      - `text_content` (text, nullable - user's thoughts)
      - `music_tag` (text, nullable)
      - `location_tag` (text, nullable)
      - `is_private` (boolean)
      - `shared_with_everyone` (boolean)
      - `metadata` (jsonb, nullable - dimensions, duration, etc.)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `friendships` - Friend relationships
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `friend_id` (uuid, references profiles)
      - `status` (enum: pending, accepted, declined)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `entry_shares` - Specific entry sharing with friends
      - `id` (uuid, primary key)
      - `entry_id` (uuid, references entries)
      - `shared_with_user_id` (uuid, references profiles)
      - `created_at` (timestamp)

    - `invites` - Friend invitation system
      - `id` (uuid, primary key)
      - `inviter_id` (uuid, references profiles)
      - `invite_code` (text, unique)
      - `message` (text, nullable)
      - `expires_at` (timestamp)
      - `max_uses` (integer)
      - `current_uses` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamp)

    - `push_tokens` - Device push notification tokens
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `token` (text, Expo push token)
      - `platform` (text: ios, android, web)
      - `device_id` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for friend-based sharing
    - Add policies for invite system

  3. Storage
    - Create storage buckets for media files
    - Set up proper access policies
*/

-- Create custom types
CREATE TYPE entry_type AS ENUM ('photo', 'video', 'audio');
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');

-- Create function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
BEGIN
  RETURN array_to_string(
    ARRAY(
      SELECT substring('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' 
      FROM (ceil(random()*62))::int FOR 1)
      FROM generate_series(1, 8)
    ), ''
  );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  invite_code text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type entry_type NOT NULL,
  content_url text,
  text_content text,
  music_tag text,
  location_tag text,
  is_private boolean DEFAULT false,
  shared_with_everyone boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status friendship_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create entry_shares table
CREATE TABLE IF NOT EXISTS entry_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entry_id, shared_with_user_id)
);

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code text UNIQUE NOT NULL,
  message text,
  expires_at timestamptz NOT NULL,
  max_uses integer DEFAULT 10,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text CHECK (platform IN ('ios', 'android', 'web')),
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT push_tokens_user_device_key UNIQUE (user_id, device_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Entries policies
CREATE POLICY "Users can read own entries"
  ON entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read shared entries"
  ON entries
  FOR SELECT
  TO authenticated
  USING (
    shared_with_everyone = true OR
    EXISTS (
      SELECT 1 FROM entry_shares 
      WHERE entry_shares.entry_id = entries.id 
      AND entry_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entries"
  ON entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Friendships policies
CREATE POLICY "Users can read own friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendship status"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id);

-- Entry shares policies
CREATE POLICY "Users can read shares for their entries"
  ON entry_shares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries 
      WHERE entries.id = entry_shares.entry_id 
      AND entries.user_id = auth.uid()
    ) OR
    shared_with_user_id = auth.uid()
  );

CREATE POLICY "Users can create shares for their entries"
  ON entry_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries 
      WHERE entries.id = entry_shares.entry_id 
      AND entries.user_id = auth.uid()
    )
  );

-- Invites policies
CREATE POLICY "Users can read own invites"
  ON invites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id);

CREATE POLICY "Anyone can read active invites by code"
  ON invites
  FOR SELECT
  TO authenticated
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create invites"
  ON invites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update own invites"
  ON invites
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = inviter_id);

-- Push tokens policies
CREATE POLICY "Users can read own push tokens"
  ON push_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_entry_shares_entry_id ON entry_shares(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_shares_user_id ON entry_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- Create function to set invite code on profile creation
CREATE OR REPLACE FUNCTION set_profile_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set invite_code if it's not already provided
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to set invite_code on profile creation
CREATE TRIGGER set_profile_invite_code_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_invite_code();

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('media', 'media', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Users can upload their own media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own media"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket (public read)
CREATE POLICY "Anyone can read avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);