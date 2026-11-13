-- Run only after the new backend is live and signature verification is tested.
-- This cutover is separate from pre-deployment schema migrations.
BEGIN;

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
