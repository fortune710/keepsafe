#!/usr/bin/env python3
"""Fail closed until both signed webhook paths have completed cutover."""

import os
import sys

import psycopg


def main():
    try:
        with psycopg.connect(os.environ["SUPABASE_DB_URL"], connect_timeout=10) as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT count(*) = 2
                    FROM pg_catalog.pg_trigger t
                    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND t.tgenabled IN ('O', 'A')
                      AND t.tgtype = 5
                      AND t.tgfoid = to_regprocedure('keepsafe_internal.generate_hmac()')
                      AND (c.relname, t.tgname) IN (
                        ('entries', 'process_entry_signed'),
                        ('entry_reports', 'send_email_for_report_signed'))
                """)
                triggers_ready = cursor.fetchone()[0]
                cursor.execute("""
                    SELECT count(*) = 2 FROM pg_catalog.pg_trigger t
                    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND t.tgenabled = 'D'
                      AND (c.relname, t.tgname) IN (
                        ('entries', 'process_entry'),
                        ('entry_reports', 'send_email_for_report'))
                """)
                legacy_disabled = cursor.fetchone()[0]
                cursor.execute("""
                    SELECT EXISTS (SELECT 1 FROM cron.job
                      WHERE jobname = 'keepsafe-webhook-delivery' AND active
                        AND command = 'SELECT keepsafe_internal.dispatch_webhooks()')
                      AND (SELECT count(*) = 2 FROM keepsafe_internal.webhook_delivery_status
                           WHERE source_table IN ('entries', 'entry_reports'))
                """)
                delivery_ready = cursor.fetchone()[0]
    except (KeyError, psycopg.Error):
        print("Could not verify durable webhook cutover; deployment stopped.", file=sys.stderr)
        return 1
    if not (triggers_ready and legacy_disabled and delivery_ready):
        print("Complete and verify signed webhook cutover before deployment.", file=sys.stderr)
        return 1
    print("Verified signed webhook triggers, dispatcher, and successful delivery for both paths.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
