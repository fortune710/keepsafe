const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const db = new PGlite();
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const friend = '33333333-3333-4333-8333-333333333333';
  const diary = '44444444-4444-4444-8444-444444444444';
  const capsule = '55555555-5555-4555-8555-555555555555';
  const entry = '66666666-6666-4666-8666-666666666666';
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create table public.diaries (id uuid primary key, user_id uuid not null);
      create table public.entries (id uuid primary key, user_id uuid not null, diary_id uuid, is_private boolean, shared_with_everyone boolean, shared_with varchar[], updated_at timestamptz);
      create table public.time_capsules (id uuid primary key, entry_id uuid, user_id uuid, status text);
      create table public.entry_shares (entry_id uuid, shared_with_user_id uuid, unique(entry_id, shared_with_user_id));
      create table public.friendships (user_id uuid, friend_id uuid, status text);
      insert into public.diaries values ('${diary}', '${owner}');
      insert into public.entries (id, user_id) values ('${entry}', '${owner}');
      insert into public.time_capsules values ('${capsule}', '${entry}', '${owner}', 'unlocked');
      insert into public.friendships values ('${owner}', '${friend}', 'accepted');
      select set_config('test.uid', '${owner}', false);
    `);
    await db.exec(fs.readFileSync(path.join(__dirname, '../migrations/20261128000831_save_opened_capsule.sql'), 'utf8'));
    await db.exec(`
      alter table public.entries enable row level security;
      alter table public.entry_shares enable row level security;
      grant usage on schema auth to authenticated;
      grant select on public.entries, public.entry_shares to authenticated;
      create policy own_entries on public.entries for select to authenticated using (user_id = auth.uid());
      create policy shared_entries on public.entries for select to authenticated using (
        shared_with_everyone = true or exists (select 1 from public.entry_shares s where s.entry_id = entries.id and s.shared_with_user_id = auth.uid())
      );
    `);
    const run = (mode, ids = []) => db.query('select public.save_opened_time_capsule($1,$2,$3,$4::uuid[]) as entry', [capsule, diary, mode, ids]);
    await run('friends', [friend, friend]);
    let shares = await db.query('select * from public.entry_shares');
    assert.equal(shares.rows.length, 1);
    let result = await db.query('select * from public.entries');
    assert.equal(result.rows[0].diary_id, diary);
    assert.deepEqual(result.rows[0].shared_with, [owner, friend]);
    await db.exec(`select set_config('test.uid', '${friend}', false); set role authenticated;`);
    assert.equal((await db.query('select * from public.entries')).rows.length, 1, 'selected friend can read the entry');
    await db.exec(`reset role; select set_config('test.uid', '${owner}', false);`);
    await assert.rejects(() => run('friends', [other]));
    shares = await db.query('select * from public.entry_shares');
    assert.equal(shares.rows.length, 1, 'failed saves leave old sharing intact');
    await run('private');
    shares = await db.query('select * from public.entry_shares');
    assert.equal(shares.rows.length, 0);
    result = await db.query('select * from public.entries');
    assert.deepEqual(result.rows[0].shared_with, [owner]);
    assert.equal(result.rows[0].is_private, true);
    await db.exec(`select set_config('test.uid', '${friend}', false); set role authenticated;`);
    assert.equal((await db.query('select * from public.entries')).rows.length, 0, 'private selection revokes friend access');
    await db.exec(`reset role; select set_config('test.uid', '${owner}', false);`);
    await run('everyone');
    result = await db.query('select * from public.entries');
    assert.equal(result.rows[0].shared_with_everyone, true);
    assert.deepEqual(result.rows[0].shared_with, [owner, friend]);
    await db.exec(`update public.time_capsules set status = 'locked'`);
    await assert.rejects(() => run('private'));
    await db.exec(`update public.time_capsules set status = 'unlocked'; select set_config('test.uid', '${other}', false);`);
    await assert.rejects(() => run('private'));
    console.log('Opened capsule database tests passed.');
  } finally { await db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
