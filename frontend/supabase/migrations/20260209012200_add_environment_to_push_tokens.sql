-- Add environment column to push_tokens table
-- This allows separating dev and prod push tokens for the same user/device

-- Add environment column with CHECK constraint
ALTER TABLE push_tokens
ADD COLUMN IF NOT EXISTS environment text CHECK (environment IN ('prod', 'dev')) DEFAULT 'prod';

-- Drop the old unique constraint
ALTER TABLE push_tokens
DROP CONSTRAINT IF EXISTS push_tokens_user_device_key;

-- Create new unique constraint that includes environment
ALTER TABLE push_tokens
ADD CONSTRAINT push_tokens_user_device_environment_key UNIQUE (user_id, device_id, environment);

-- Update existing rows to have 'prod' environment (if any exist)
UPDATE push_tokens
SET environment = 'prod'
WHERE environment IS NULL;

-- Make environment NOT NULL after backfilling
ALTER TABLE push_tokens
ALTER COLUMN environment SET NOT NULL;
