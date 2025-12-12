/*
  # Notification Settings Table

  1. New Table
    - `notification_settings` - Per-user notification preferences (1 row per user)
      - `id` (bigint, primary key)
      - `user_id` (uuid, references profiles)
      - `friend_requests` (boolean)
      - `push_notifications` (boolean)
      - `entry_reminder` (boolean)
      - `friend_activity` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Policies so users can manage only their own notification settings
*/

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_requests boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  entry_reminder boolean NOT NULL DEFAULT false,
  friend_activity boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own notification settings
CREATE POLICY "Users can read own notification settings"
  ON notification_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification settings"
  ON notification_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id
  ON notification_settings(user_id);

-- updated_at trigger
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


