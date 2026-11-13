-- Restore the original webhook triggers atomically if cutover must be undone.
BEGIN;

LOCK TABLE public.entries, public.entry_reports IN SHARE ROW EXCLUSIVE MODE;
DROP TRIGGER process_entry_signed ON public.entries;
DROP TRIGGER send_email_for_report_signed ON public.entry_reports;
ALTER TABLE public.entries ENABLE TRIGGER process_entry;
ALTER TABLE public.entry_reports ENABLE TRIGGER send_email_for_report;

COMMIT;
