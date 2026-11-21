/* Execute the actual migrations against a local Postgres runtime with mocked
 * pg_net, Vault and pg_cron. No production database or network is used. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');

const root = path.resolve(__dirname, '../../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

async function main() {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
      CREATE SCHEMA vault; CREATE SCHEMA net; CREATE SCHEMA cron;
      CREATE TABLE vault.decrypted_secrets (name text, decrypted_secret text);
      CREATE VIEW vault.secrets AS SELECT name FROM vault.decrypted_secrets;
      INSERT INTO vault.decrypted_secrets VALUES ('keepsafe_webhook_secret', 'test-secret');
      CREATE TABLE cron.job (jobname text PRIMARY KEY, schedule text, command text, active boolean DEFAULT true);
      CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint
      LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO cron.job(jobname, schedule, command) VALUES (job_name, schedule, command);
        RETURN 1;
      END $$;
      CREATE TABLE net.http_request_queue (id bigint GENERATED ALWAYS AS IDENTITY, url text, body jsonb, headers jsonb);
      CREATE TABLE net._http_response (id bigint, status_code integer, timed_out boolean, error_msg text, content text);
      CREATE FUNCTION net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds integer)
      RETURNS bigint LANGUAGE plpgsql AS $$ DECLARE request_id bigint; BEGIN
        INSERT INTO net.http_request_queue(url, body, headers) VALUES (url, body, headers) RETURNING id INTO request_id;
        RETURN request_id;
      END $$;
      CREATE TABLE public.entries (id text PRIMARY KEY, content text);
      CREATE TABLE public.entry_reports (id text PRIMARY KEY, reason text);
      CREATE FUNCTION public.legacy_noop() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
      CREATE TRIGGER process_entry AFTER INSERT ON public.entries FOR EACH ROW EXECUTE FUNCTION public.legacy_noop();
      CREATE TRIGGER send_email_for_report AFTER INSERT ON public.entry_reports FOR EACH ROW EXECUTE FUNCTION public.legacy_noop();
    `);

    await db.exec(read('frontend/supabase/migrations/20261113001903_generate_hmac.sql'));
    const migration = read('frontend/supabase/migrations/20261120065722_durable_webhook_outbox.sql');
    assert.ok(migration.includes('CREATE EXTENSION IF NOT EXISTS pg_cron;'));
    await db.exec(migration.replace('CREATE EXTENSION IF NOT EXISTS pg_cron;', '-- mocked in this test'));

    const activation = read('scripts/deploy/activate-signed-webhooks.sql');
    await db.exec("UPDATE cron.job SET active = false WHERE jobname = 'keepsafe-webhook-delivery'");
    await assert.rejects(db.exec(activation), /dispatcher must be scheduled and active/);
    await db.exec('ROLLBACK');
    await db.exec("UPDATE cron.job SET active = true WHERE jobname = 'keepsafe-webhook-delivery'");
    await db.exec(activation);

    await db.exec("BEGIN; INSERT INTO public.entries VALUES ('rolled-back', 'private'); ROLLBACK;");
    assert.equal((await db.query('SELECT count(*)::int AS count FROM keepsafe_internal.webhook_outbox')).rows[0].count, 0);
    await db.exec("INSERT INTO public.entries VALUES ('entry-1', 'hello'); INSERT INTO public.entry_reports VALUES ('report-1', 'spam');");
    assert.equal((await db.query('SELECT count(*)::int AS count FROM keepsafe_internal.webhook_outbox WHERE delivered_at IS NULL')).rows[0].count, 2);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM net.http_request_queue')).rows[0].count, 0);

    await db.exec('SELECT keepsafe_internal.dispatch_webhooks()');
    const requests = (await db.query('SELECT id, url, body, headers FROM net.http_request_queue ORDER BY id')).rows;
    assert.equal(requests.length, 2);
    assert.ok(requests.some(row => row.url.endsWith('/webhooks/entries')));
    assert.ok(requests.some(row => row.url.endsWith('/webhooks/entry-reports')));
    assert.ok(requests.every(row => /^[0-9a-f]{64}$/.test(row.headers['x-supabase-signature'])));
    const signed = await db.query(`SELECT bool_and(q.headers->>'x-supabase-signature' =
      encode(extensions.hmac(convert_to(q.body::text, 'UTF8'), convert_to('test-secret', 'UTF8'), 'sha256'), 'hex')) AS valid
      FROM net.http_request_queue q`);
    assert.equal(signed.rows[0].valid, true);
    await db.exec('SELECT keepsafe_internal.dispatch_webhooks()');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM net.http_request_queue')).rows[0].count, 2);

    await db.exec(`INSERT INTO net._http_response (id, status_code, content)
      SELECT id, 200, '{"status":"partial_success"}' FROM net.http_request_queue;`);
    await db.exec('SELECT keepsafe_internal.dispatch_webhooks()');
    assert.equal((await db.query("SELECT count(*)::int AS count FROM keepsafe_internal.webhook_outbox WHERE delivered_at IS NULL AND last_error = 'unsuccessful_response'")).rows[0].count, 2);
    await db.exec("UPDATE keepsafe_internal.webhook_outbox SET next_attempt_at = now() - interval '1 second'; SELECT keepsafe_internal.dispatch_webhooks();");
    assert.equal((await db.query('SELECT count(*)::int AS count FROM net.http_request_queue')).rows[0].count, 4);
    await db.exec(`INSERT INTO net._http_response (id, status_code, content)
      SELECT request_id, 200, '{"status":"success"}' FROM keepsafe_internal.webhook_outbox WHERE delivered_at IS NULL;`);
    await db.exec('SELECT keepsafe_internal.dispatch_webhooks()');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM keepsafe_internal.webhook_outbox WHERE delivered_at IS NOT NULL AND payload IS NULL AND signature IS NULL')).rows[0].count, 2);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM keepsafe_internal.webhook_delivery_status')).rows[0].count, 2);

    await db.exec("DELETE FROM vault.decrypted_secrets; INSERT INTO public.entries VALUES ('entry-2', 'waiting'); SELECT keepsafe_internal.dispatch_webhooks();");
    assert.equal((await db.query('SELECT count(*)::int AS count FROM net.http_request_queue')).rows[0].count, 4);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM keepsafe_internal.webhook_outbox WHERE delivered_at IS NULL AND signature IS NULL")).rows[0].count, 1);
    await db.exec("INSERT INTO vault.decrypted_secrets VALUES ('keepsafe_webhook_secret', 'rotated-secret'); SELECT keepsafe_internal.dispatch_webhooks();");
    await db.exec("UPDATE keepsafe_internal.webhook_outbox SET sent_at = now() - interval '4 minutes' WHERE delivered_at IS NULL; SELECT keepsafe_internal.dispatch_webhooks();");
    assert.equal((await db.query("SELECT count(*)::int AS count FROM keepsafe_internal.webhook_outbox WHERE delivered_at IS NULL AND request_id IS NULL AND last_error = 'missing_response'")).rows[0].count, 1);
    await db.exec("UPDATE keepsafe_internal.webhook_outbox SET next_attempt_at = now() - interval '1 second' WHERE delivered_at IS NULL; SELECT keepsafe_internal.dispatch_webhooks();");
    assert.equal((await db.query('SELECT count(*)::int AS count FROM net.http_request_queue')).rows[0].count, 6);
    const permissions = await db.query("SELECT has_table_privilege('anon','keepsafe_internal.webhook_outbox','SELECT') AS anon, has_table_privilege('authenticated','keepsafe_internal.webhook_outbox','SELECT') AS authenticated");
    assert.deepEqual(permissions.rows[0], { anon: false, authenticated: false });
    console.log('Durable signed webhook delivery tests passed');
  } finally {
    await db.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
