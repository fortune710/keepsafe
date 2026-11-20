-- Keep events in a logged, private table until the receiver confirms success.
-- pg_net's own request/response queues are unlogged and cannot be the source
-- of truth after a database restart.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE keepsafe_internal.webhook_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_table text NOT NULL CHECK (source_table IN ('entries', 'entry_reports')),
  payload jsonb,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0,
  request_id bigint,
  sent_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  CHECK ((request_id IS NULL) = (sent_at IS NULL)),
  CHECK (delivered_at IS NOT NULL OR payload IS NOT NULL)
);

CREATE INDEX webhook_outbox_pending_idx
  ON keepsafe_internal.webhook_outbox (next_attempt_at, id)
  WHERE delivered_at IS NULL AND request_id IS NULL;
CREATE INDEX webhook_outbox_inflight_idx
  ON keepsafe_internal.webhook_outbox (sent_at, id)
  WHERE delivered_at IS NULL AND request_id IS NOT NULL;

CREATE TABLE keepsafe_internal.webhook_delivery_status (
  source_table text PRIMARY KEY CHECK (source_table IN ('entries', 'entry_reports')),
  last_delivered_at timestamptz NOT NULL
);

ALTER TABLE keepsafe_internal.webhook_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE keepsafe_internal.webhook_delivery_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE keepsafe_internal.webhook_outbox, keepsafe_internal.webhook_delivery_status FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE keepsafe_internal.webhook_outbox_id_seq FROM PUBLIC, anon, authenticated;

-- An insert and its webhook event commit or roll back together. A missing
-- signing key does not prevent the user's entry from being saved: the worker
-- keeps the event pending until the key becomes available.
CREATE OR REPLACE FUNCTION keepsafe_internal.generate_hmac()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payload jsonb;
  signing_secret text;
  signature text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME NOT IN ('entries', 'entry_reports')
     OR TG_WHEN <> 'AFTER' OR TG_LEVEL <> 'ROW' OR TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'generate_hmac requires an AFTER INSERT row trigger on a supported table';
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP, 'table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW), 'old_record', NULL
  );
  SELECT decrypted_secret INTO signing_secret
  FROM vault.decrypted_secrets WHERE name = 'keepsafe_webhook_secret';
  IF signing_secret IS NOT NULL AND signing_secret <> '' THEN
    signature := encode(
      extensions.hmac(convert_to(payload::text, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
      'hex'
    );
  END IF;
  INSERT INTO keepsafe_internal.webhook_outbox (source_table, payload, signature)
  VALUES (TG_TABLE_NAME, payload, signature);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION keepsafe_internal.generate_hmac() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION keepsafe_internal.dispatch_webhooks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_row record;
  response_row record;
  response_ok boolean;
  signing_secret text;
  new_request_id bigint;
  new_signature text;
BEGIN
  -- Serialize cron invocations and any manual retry without blocking inserts.
  IF NOT pg_try_advisory_xact_lock(1280133203, 1464160843) THEN
    RETURN;
  END IF;

  FOR event_row IN
    SELECT * FROM keepsafe_internal.webhook_outbox
    WHERE delivered_at IS NULL AND request_id IS NOT NULL
    ORDER BY sent_at, id LIMIT 100 FOR UPDATE SKIP LOCKED
  LOOP
    SELECT status_code, timed_out, error_msg, content INTO response_row
    FROM net._http_response WHERE id = event_row.request_id;
    IF FOUND THEN
      response_ok := false;
      BEGIN
        response_ok := response_row.status_code BETWEEN 200 AND 299
          AND NOT coalesce(response_row.timed_out, false)
          AND response_row.error_msg IS NULL
          AND coalesce(response_row.content::jsonb ->> 'status' = 'success', false);
      EXCEPTION WHEN invalid_text_representation THEN
        response_ok := false;
      END;

      IF response_ok THEN
        UPDATE keepsafe_internal.webhook_outbox
        SET delivered_at = now(), payload = NULL, signature = NULL,
            request_id = NULL, sent_at = NULL, last_error = NULL
        WHERE id = event_row.id;
        INSERT INTO keepsafe_internal.webhook_delivery_status (source_table, last_delivered_at)
        VALUES (event_row.source_table, now())
        ON CONFLICT (source_table) DO UPDATE SET last_delivered_at = EXCLUDED.last_delivered_at;
      ELSE
        UPDATE keepsafe_internal.webhook_outbox
        SET request_id = NULL, sent_at = NULL, last_error = 'unsuccessful_response',
            next_attempt_at = now() + make_interval(secs => LEAST(1800, 30 * power(2, LEAST(attempt_count - 1, 6))::integer))
        WHERE id = event_row.id;
      END IF;
    ELSIF event_row.sent_at < now() - interval '3 minutes' THEN
      -- pg_net queues can disappear on a crash; a missing response is not success.
      UPDATE keepsafe_internal.webhook_outbox
      SET request_id = NULL, sent_at = NULL, last_error = 'missing_response',
          next_attempt_at = now() + make_interval(secs => LEAST(1800, 30 * power(2, LEAST(attempt_count - 1, 6))::integer))
      WHERE id = event_row.id;
    END IF;
  END LOOP;

  SELECT decrypted_secret INTO signing_secret
  FROM vault.decrypted_secrets WHERE name = 'keepsafe_webhook_secret';
  IF signing_secret IS NULL OR signing_secret = '' THEN
    RETURN;
  END IF;

  FOR event_row IN
    SELECT * FROM keepsafe_internal.webhook_outbox
    WHERE delivered_at IS NULL AND request_id IS NULL AND next_attempt_at <= now()
    ORDER BY next_attempt_at, id LIMIT 100 FOR UPDATE SKIP LOCKED
  LOOP
    -- Sign again at dispatch so key rotation does not strand queued events.
    new_signature := encode(
      extensions.hmac(convert_to(event_row.payload::text, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
      'hex'
    );
    new_request_id := net.http_post(
      url := 'https://keepsafeapi.fortunealebiosu.dev' || CASE event_row.source_table
        WHEN 'entries' THEN '/webhooks/entries'
        WHEN 'entry_reports' THEN '/webhooks/entry-reports'
      END,
      body := event_row.payload,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-supabase-signature', new_signature),
      timeout_milliseconds := 60000
    );
    UPDATE keepsafe_internal.webhook_outbox
    SET request_id = new_request_id, sent_at = now(),
        signature = new_signature, attempt_count = attempt_count + 1,
        last_error = NULL
    WHERE id = event_row.id;
  END LOOP;

  -- Keep completion metadata for operations; payloads are removed on success.
  DELETE FROM keepsafe_internal.webhook_outbox
  WHERE delivered_at < now() - interval '30 days';
END;
$$;
REVOKE ALL ON FUNCTION keepsafe_internal.dispatch_webhooks() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('keepsafe-webhook-delivery', '* * * * *',
  'SELECT keepsafe_internal.dispatch_webhooks()');
