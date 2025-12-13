/*
  # Privacy Settings Table

  1. New Table
    - `privacy_settings` - Per-user privacy preferences (1 row per user)
      - `id` (bigint, primary key)
      - `user_id` (uuid, references profiles)
      - `auto_share` (boolean)
      - `location_share` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Policies so users can manage only their own privacy settings
*/

-- Create privacy_settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  auto_share boolean NOT NULL DEFAULT false,
  location_share boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own privacy settings
CREATE POLICY "Users can read own privacy settings"
  ON privacy_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON privacy_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON privacy_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own privacy settings"
  ON privacy_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id
  ON privacy_settings(user_id);

-- updated_at trigger
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


