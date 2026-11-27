-- Index inactive push tokens for efficient cleanup lookups.
-- Partial index keeps only inactive rows, matching the cron delete filter.
CREATE INDEX IF NOT EXISTS idx_push_tokens_inactive
  ON push_tokens (id)
  WHERE inactive = true;

-- Hard-delete inactive push tokens in batches of 500 every 10 minutes.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'keepsafe-cleanup-inactive-push-tokens',
  '*/10 * * * *',
  $$
  DELETE FROM push_tokens
  WHERE id IN (
    SELECT id
    FROM push_tokens
    WHERE inactive = true
    LIMIT 500
  );
  $$
);
