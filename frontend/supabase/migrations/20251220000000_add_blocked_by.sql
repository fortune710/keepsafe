-- Add blocked_by column to friendships table
-- This column tracks who initiated the block action

ALTER TABLE friendships 
ADD COLUMN blocked_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for better performance when querying blocked users
CREATE INDEX IF NOT EXISTS idx_friendships_blocked_by ON friendships(blocked_by);

-- Update the existing friendship update policy to allow the blocker to update
DROP POLICY IF EXISTS "Users can update friendship status" ON friendships;

CREATE POLICY "Users can update friendship status"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id OR auth.uid() = user_id)
  WITH CHECK (
    (auth.uid() = friend_id OR auth.uid() = user_id) 
    AND (blocked_by IS NULL OR blocked_by = auth.uid())
  );

