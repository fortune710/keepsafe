-- Add inactive column to push_tokens table
-- Used to mark push tokens that should no longer receive notifications

ALTER TABLE push_tokens
ADD COLUMN IF NOT EXISTS inactive boolean NOT NULL DEFAULT false;
