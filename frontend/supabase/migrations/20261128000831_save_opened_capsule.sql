-- Synchronize the entry and its share rows in one transaction. A definer is
-- necessary because entry_shares has no client DELETE policy; scope every write
-- to the authenticated owner and an unlocked capsule.
create or replace function public.save_opened_time_capsule(
  p_capsule_id uuid, p_diary_id uuid, p_sharing text, p_friend_ids uuid[] default '{}'
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_entry_id uuid;
  v_friends uuid[] := coalesce(p_friend_ids, '{}'::uuid[]);
  v_recipients uuid[];
  v_entry public.entries%rowtype;
begin
  if v_user is null then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_sharing is null or p_sharing not in ('private', 'everyone', 'friends') or
     (p_sharing = 'friends' and cardinality(v_friends) = 0) or
     (p_sharing <> 'friends' and cardinality(v_friends) <> 0) or
     array_position(v_friends, null) is not null then
    raise exception 'Invalid sharing selection' using errcode = '22023';
  end if;
  if not exists (select 1 from public.diaries d where d.id = p_diary_id and d.user_id = v_user) then
    raise exception 'Invalid diary' using errcode = '42501';
  end if;
  select tc.entry_id into v_entry_id from public.time_capsules tc
    join public.entries e on e.id = tc.entry_id and e.user_id = v_user
    where tc.id = p_capsule_id and tc.user_id = v_user and tc.status = 'unlocked'
    for update of tc, e;
  if v_entry_id is null then raise exception 'Time capsule not available' using errcode = '42501'; end if;
  if p_sharing = 'friends' and exists (
    select 1 from unnest(v_friends) f(id) where f.id = v_user or not exists (
      select 1 from public.friendships fs where fs.status = 'accepted'
        and ((fs.user_id = v_user and fs.friend_id = f.id) or (fs.friend_id = v_user and fs.user_id = f.id))
    )
  ) then raise exception 'Invalid sharing selection' using errcode = '42501'; end if;
  if p_sharing = 'everyone' then
    select coalesce(array_agg(distinct case when fs.user_id = v_user then fs.friend_id else fs.user_id end), '{}'::uuid[])
      into v_recipients from public.friendships fs where fs.status = 'accepted' and (fs.user_id = v_user or fs.friend_id = v_user);
  elsif p_sharing = 'friends' then
    select coalesce(array_agg(distinct f.id), '{}'::uuid[]) into v_recipients from unnest(v_friends) f(id);
  else v_recipients := '{}'::uuid[];
  end if;
  delete from public.entry_shares where entry_id = v_entry_id;
  insert into public.entry_shares (entry_id, shared_with_user_id)
    select v_entry_id, f.id from unnest(v_recipients) f(id);
  update public.entries set diary_id = p_diary_id, is_private = (p_sharing = 'private'),
    shared_with_everyone = (p_sharing = 'everyone'),
    shared_with = array[v_user::text] || array(select f.id::text from unnest(v_recipients) f(id)),
    updated_at = now()
    where id = v_entry_id and user_id = v_user returning * into v_entry;
  return to_jsonb(v_entry);
end;
$$;
revoke all on function public.save_opened_time_capsule(uuid, uuid, text, uuid[]) from public, anon;
grant execute on function public.save_opened_time_capsule(uuid, uuid, text, uuid[]) to authenticated;

-- The previous entry_shares SELECT policy queried entries, whose shared-entry
-- policy queries entry_shares. Break that RLS recursion without exposing entries.
create or replace function public.owns_entry(p_entry_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.entries e where e.id = p_entry_id and e.user_id = auth.uid()
  )
$$;
revoke all on function public.owns_entry(uuid) from public, anon;
grant execute on function public.owns_entry(uuid) to authenticated;
drop policy if exists "Users can read shares for their entries" on public.entry_shares;
create policy "Users can read shares for their entries" on public.entry_shares
  for select to authenticated using (public.owns_entry(entry_id) or shared_with_user_id = (select auth.uid()));
