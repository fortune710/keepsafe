-- This function is deliberately not attached to a trigger. Configure the
-- Vault secret and backend signature verification before switching delivery.
CREATE SCHEMA IF NOT EXISTS keepsafe_internal;
REVOKE ALL ON SCHEMA keepsafe_internal FROM PUBLIC, anon, authenticated;

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
  target_path text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME NOT IN ('entries', 'entry_reports')
     OR TG_WHEN <> 'AFTER' OR TG_LEVEL <> 'ROW' OR TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'generate_hmac requires an AFTER INSERT row trigger on a supported table';
  END IF;

  target_path := CASE TG_TABLE_NAME
    WHEN 'entries' THEN '/webhooks/entries'
    WHEN 'entry_reports' THEN '/webhooks/entry-reports'
  END;

  SELECT decrypted_secret INTO signing_secret
  FROM vault.decrypted_secrets
  WHERE name = 'keepsafe_webhook_secret';

  IF signing_secret IS NULL OR signing_secret = '' THEN
    RAISE EXCEPTION 'Keepsafe webhook signing secret is not configured';
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', NULL
  );

  signature := encode(
    extensions.hmac(convert_to(payload::text, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
    'hex'
  );

  PERFORM net.http_post(
    url := 'https://keepsafeapi.fortunealebiosu.dev' || target_path,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-supabase-signature', signature
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION keepsafe_internal.generate_hmac() FROM PUBLIC, anon, authenticated;
