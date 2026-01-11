/*
  # Streaks Table

  1. New Table
    - `streaks` - Per-user streak stats (1 row per user)
      - `id` (bigint, primary key)
      - `user_id` (uuid, references profiles)
      - `current_streak` (integer)
      - `max_streak` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Policies so users can manage only their own streak record
*/

-- Create streaks table
CREATE TABLE IF NOT EXISTS streaks (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  max_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Backfill and enforce NOT NULL constraints for existing rows (if any)
UPDATE streaks
SET created_at = now()
WHERE created_at IS NULL;

UPDATE streaks
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE streaks
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Enable Row Level Security
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own streak record
CREATE POLICY "Users can read own streak"
  ON streaks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak"
  ON streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own streak"
  ON streaks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaks_user_id
  ON streaks(user_id);

-- updated_at trigger
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

