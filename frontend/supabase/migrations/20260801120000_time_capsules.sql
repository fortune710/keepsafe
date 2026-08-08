/*
  # Time capsules

  1. New Tables
    - time_capsules
  2. Security
    - Enable RLS
    - Select/insert policies for owner access (status transitions go through the two
      security-definer RPC functions below, not a general update policy)
  3. Entries visibility
    - entries SELECT policies gain a NOT EXISTS guard hiding locked/pending capsule entries
    - visible_entries view for the one Python backend read path that can't express NOT EXISTS
  4. RPC functions
    - request_time_capsule_release: starts the 24h (date) / 2h (condition) release countdown
    - cancel_time_capsule_release: cancels a pending release, back to locked
*/

create table if not exists public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null unique references public.entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  reveal_type text not null check (reveal_type in ('date', 'condition')),
  unlock_at timestamptz,
  condition_label text,

  status text not null default 'locked' check (status in ('locked', 'pending_release', 'unlocked')),

  release_requested_at timestamptz,
  release_available_at timestamptz,
  unlocked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint time_capsules_reveal_fields_check check (
    (reveal_type = 'date' and unlock_at is not null and unlock_at > now() and condition_label is null)
    or
    (reveal_type = 'condition' and condition_label is not null and unlock_at is null)
  )
);

create index if not exists idx_time_capsules_user_status on public.time_capsules(user_id, status);
create index if not exists idx_time_capsules_due_date_unlock
  on public.time_capsules(unlock_at) where status = 'locked' and reveal_type = 'date';
create index if not exists idx_time_capsules_due_release
  on public.time_capsules(release_available_at) where status = 'pending_release';

alter table public.time_capsules enable row level security;

drop policy if exists "Users can read own time capsules" on public.time_capsules;
create policy "Users can read own time capsules"
  on public.time_capsules
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Direct client creation is allowed, but only for an entry the caller actually owns.
drop policy if exists "Users can create own time capsules" on public.time_capsules;
create policy "Users can create own time capsules"
  on public.time_capsules
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

-- Deliberately no general UPDATE policy: status transitions only happen via the two
-- security-definer RPC functions below (which bypass RLS internally and enforce the
-- 24h/2h wait server-side) or the backend scheduler's service-role client. This is what
-- keeps the wait from being client-tamperable while still letting the *call* to
-- request/cancel a release be a direct frontend-to-Supabase call.

drop trigger if exists update_time_capsules_updated_at on public.time_capsules;
create trigger update_time_capsules_updated_at
  before update on public.time_capsules
  for each row
  execute function update_updated_at_column();

-- Hide locked/pending capsule entries from the normal entries feed. Supabase Realtime
-- also respects RLS, so this covers the direct-client read/subscribe path used by
-- frontend/hooks/use-user-entries.ts without any application-layer filtering.
drop policy if exists "Users can read own entries" on public.entries;
create policy "Users can read own entries"
  on public.entries
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.time_capsules tc
      where tc.entry_id = entries.id and tc.status <> 'unlocked'
    )
  );

drop policy if exists "Users can read shared entries" on public.entries;
create policy "Users can read shared entries"
  on public.entries
  for select
  to authenticated
  using (
    (
      shared_with_everyone = true
      or exists (
        select 1 from public.entry_shares
        where entry_shares.entry_id = entries.id
        and entry_shares.shared_with_user_id = auth.uid()
      )
    )
    and not exists (
      select 1 from public.time_capsules tc
      where tc.entry_id = entries.id and tc.status <> 'unlocked'
    )
  );

-- Secondary read path: backend/controllers/entry_controller.py's fetch_user_entries_by_month
-- (used only by the monthly-dump month-picker) goes through supabase-py, which can't express
-- NOT EXISTS cleanly - point that one read at this view instead of the base table.
create or replace view public.visible_entries as
  select e.*
  from public.entries e
  where not exists (
    select 1 from public.time_capsules tc
    where tc.entry_id = e.id and tc.status <> 'unlocked'
  );

alter view public.visible_entries set (security_invoker = true);
grant select on public.visible_entries to authenticated, anon;

-- Request a capsule release: starts the countdown (24h for date-type early release, 2h for
-- condition-type). Intervals are hardcoded here per the confirmed product spec - changing
-- them requires a migration, matching how the table's own CHECK constraints are also fixed
-- at schema level. Follows the same conventions as
-- 20260206000000_rpc_verify_and_update_phone.sql (security definer, explicit auth.uid()
-- check, row lock via `for update`, jsonb success/failure result, catch-all exception).
create or replace function public.request_time_capsule_release(p_capsule_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capsule record;
  v_release_at timestamptz;
begin
  select id, user_id, reveal_type, status
  into v_capsule
  from public.time_capsules
  where id = p_capsule_id
  for update;

  if v_capsule is null then
    raise exception 'Time capsule not found';
  end if;

  if auth.uid() is null or auth.uid() != v_capsule.user_id then
    raise exception 'Unauthorized: You can only release your own time capsule';
  end if;

  if v_capsule.status != 'locked' then
    raise exception 'This time capsule is not eligible for release (status: %)', v_capsule.status;
  end if;

  v_release_at := now() + (
    case v_capsule.reveal_type
      when 'date' then interval '24 hours'
      else interval '2 hours'
    end
  );

  update public.time_capsules
  set status = 'pending_release',
      release_requested_at = now(),
      release_available_at = v_release_at,
      updated_at = now()
  where id = p_capsule_id;

  return jsonb_build_object('success', true, 'release_available_at', v_release_at);
exception
  when others then
    return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

grant execute on function public.request_time_capsule_release(uuid) to authenticated;
revoke execute on function public.request_time_capsule_release(uuid) from public;

-- Cancel a pending release, reverting to locked (only valid from pending_release).
create or replace function public.cancel_time_capsule_release(p_capsule_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capsule record;
begin
  select id, user_id, status
  into v_capsule
  from public.time_capsules
  where id = p_capsule_id
  for update;

  if v_capsule is null then
    raise exception 'Time capsule not found';
  end if;

  if auth.uid() is null or auth.uid() != v_capsule.user_id then
    raise exception 'Unauthorized: You can only cancel your own time capsule release';
  end if;

  if v_capsule.status != 'pending_release' then
    raise exception 'This time capsule has no pending release to cancel (status: %)', v_capsule.status;
  end if;

  update public.time_capsules
  set status = 'locked',
      release_requested_at = null,
      release_available_at = null,
      updated_at = now()
  where id = p_capsule_id;

  return jsonb_build_object('success', true);
exception
  when others then
    return jsonb_build_object('success', false, 'message', sqlerrm);
end;
$$;

grant execute on function public.cancel_time_capsule_release(uuid) to authenticated;
revoke execute on function public.cancel_time_capsule_release(uuid) from public;
