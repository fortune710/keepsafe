/*
  # Add Comments and Reactions Tables

  1. New Tables
    - `entry_reactions` - User reactions to entries
      - `id` (uuid, primary key)
      - `entry_id` (uuid, references entries)
      - `user_id` (uuid, references profiles)
      - `reaction_type` (text, constrained to specific values)
      - `created_at` (timestamp)
      - UNIQUE constraint on (entry_id, user_id) - one reaction per user per entry

    - `entry_comments` - User comments on entries
      - `id` (uuid, primary key)
      - `entry_id` (uuid, references entries)
      - `user_id` (uuid, references profiles)
      - `content` (text, max 500 characters)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read all reactions/comments
    - Add policies for users to manage their own reactions/comments

  3. Indexes
    - Add indexes for better query performance
    - Foreign key indexes for joins
*/

-- Create entry_reactions table
CREATE TABLE IF NOT EXISTS entry_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(entry_id, user_id)
);

-- Create entry_comments table
CREATE TABLE IF NOT EXISTS entry_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (length(content) <= 500 AND length(content) > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE entry_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_comments ENABLE ROW LEVEL SECURITY;

-- Entry reactions policies
CREATE POLICY "Users can read all reactions"
  ON entry_reactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add reactions"
  ON entry_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON entry_reactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON entry_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Entry comments policies
CREATE POLICY "Users can read all comments"
  ON entry_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add comments"
  ON entry_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON entry_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON entry_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entry_reactions_entry_id ON entry_reactions(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_reactions_user_id ON entry_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_reactions_created_at ON entry_reactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entry_comments_entry_id ON entry_comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_comments_user_id ON entry_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_entry_comments_created_at ON entry_comments(created_at DESC);

-- Add updated_at trigger for comments
CREATE TRIGGER update_entry_comments_updated_at
  BEFORE UPDATE ON entry_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();