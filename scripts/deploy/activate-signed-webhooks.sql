-- Run only after the new hostname routes to the existing backend over HTTPS,
-- both webhook paths accept the signing key, and signed delivery is ready to test.
-- This cutover is separate from pre-deployment schema migrations.
BEGIN;

DO $$
BEGIN
  IF to_regclass('keepsafe_internal.webhook_outbox') IS NULL
     OR to_regprocedure('keepsafe_internal.dispatch_webhooks()') IS NULL
     OR to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'Durable webhook delivery migration must be applied before cutover';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'keepsafe-webhook-delivery' AND active
      AND command = 'SELECT keepsafe_internal.dispatch_webhooks()'
  ) THEN
    RAISE EXCEPTION 'Durable webhook dispatcher must be scheduled and active before cutover';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'keepsafe_webhook_secret') THEN
    RAISE EXCEPTION 'Webhook signing secret must be configured before cutover';
  END IF;
END;
$$;

LOCK TABLE public.entries, public.entry_reports IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.entries DISABLE TRIGGER process_entry;
ALTER TABLE public.entry_reports DISABLE TRIGGER send_email_for_report;

CREATE TRIGGER process_entry_signed
AFTER INSERT ON public.entries
FOR EACH ROW EXECUTE FUNCTION keepsafe_internal.generate_hmac();

CREATE TRIGGER send_email_for_report_signed
AFTER INSERT ON public.entry_reports
FOR EACH ROW EXECUTE FUNCTION keepsafe_internal.generate_hmac();

COMMIT;
