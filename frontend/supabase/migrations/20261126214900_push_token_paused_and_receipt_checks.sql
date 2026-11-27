-- Temporarily pause tokens after Expo MessageRateExceeded (receipts).
ALTER TABLE push_tokens
ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;

ALTER TABLE push_tokens
ADD COLUMN IF NOT EXISTS paused_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_push_tokens_paused
  ON push_tokens (id)
  WHERE paused = true;

CREATE INDEX IF NOT EXISTS idx_push_tokens_paused_at
  ON push_tokens (paused_at)
  WHERE paused = true;

-- Create the receipt-checks queue (idempotent if already present).
DO $$
BEGIN
  PERFORM pgmq.create('notification_receipt_checks');
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
  WHEN OTHERS THEN
    -- pgmq may raise differently depending on version; ignore "already exists".
    IF SQLERRM ILIKE '%already exists%' OR SQLERRM ILIKE '%duplicate%' THEN
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Flip paused tokens back to active after 10 minutes.
SELECT cron.schedule(
  'keepsafe-unpause-push-tokens',
  '* * * * *',
  $$
  UPDATE push_tokens
  SET paused = false,
      paused_at = NULL
  WHERE paused = true
    AND paused_at IS NOT NULL
    AND paused_at <= now() - interval '10 minutes';
  $$
);
