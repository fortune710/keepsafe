/*
  # User Streaks Table

  1. New Table
    - `user_streaks` - Per-user streak stats (1 row per user)
      - `id` (bigint, primary key)
      - `user_id` (uuid, references auth.users)
      - `current_streak` (integer)
      - `max_streak` (integer)
      - `last_entry_date` (date, nullable)
      - `last_access_time` (timestamptz, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Policies so users can manage only their own streak record
*/

-- Create user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  max_streak integer NOT NULL DEFAULT 0,
  last_entry_date date,
  last_access_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill and enforce NOT NULL constraints for existing rows (if any)
UPDATE user_streaks
SET created_at = now()
WHERE created_at IS NULL;

UPDATE user_streaks
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE user_streaks
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own streak record
CREATE POLICY "Users can read own streak"
  ON user_streaks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
  ON user_streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON user_streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own streak"
  ON user_streaks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_streaks_user_id
  ON user_streaks(user_id);

-- Ensure the update_updated_at_column function exists (it should from the first migration)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at trigger
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

