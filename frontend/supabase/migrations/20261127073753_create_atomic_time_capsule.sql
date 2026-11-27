-- Retain the original request so replays can be distinguished from ID reuse.
alter table public.time_capsules add column if not exists creation_request jsonb;

-- A definer is required to recognize an already locked entry, which normal entry
-- SELECT policies may hide. Explicitly enforce ownership before accessing it.
create or replace function public.create_entry_time_capsule(p_entry jsonb, p_capsule jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_entry public.entries%rowtype;
  v_existing public.entries%rowtype;
  v_capsule public.time_capsules%rowtype;
  v_request jsonb;
  v_created boolean := false;
begin
  if v_user is null or (p_entry->>'user_id')::uuid is distinct from v_user then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  v_entry := pg_catalog.jsonb_populate_record(null::public.entries, p_entry);
  if v_entry.id is null or v_entry.diary_id is null or not exists (
    select 1 from public.diaries d where d.id = v_entry.diary_id and d.user_id = v_user
  ) then
    raise exception 'Invalid diary' using errcode = '42501';
  end if;
  if coalesce(v_entry.shared_with_everyone, false) or coalesce(pg_catalog.cardinality(v_entry.shared_with), 0) <> 0 then
    raise exception 'Time capsule entries cannot be shared' using errcode = '22023';
  end if;
  v_request := pg_catalog.jsonb_build_object('entry', p_entry - 'created_at' - 'updated_at', 'capsule', p_capsule);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_entry.id::text, 0));
  select * into v_existing from public.entries where id = v_entry.id for update;
  if found and v_existing.user_id is distinct from v_user then
    raise exception 'Entry ID already in use' using errcode = '23505';
  end if;
  select * into v_capsule from public.time_capsules where entry_id = v_entry.id;
  if found and v_capsule.creation_request is not null then
    if v_capsule.user_id is distinct from v_user or v_capsule.creation_request is distinct from v_request then
      raise exception 'Entry ID already in use' using errcode = '23505';
    end if;
    return pg_catalog.jsonb_build_object('entry', pg_catalog.to_jsonb(v_existing), 'created', false);
  end if;
  -- Only legacy rows lack an original request to compare. Check their stored
  -- entry fields before attaching or accepting an existing legacy capsule.
  if v_existing.id is not null and (
    v_existing.user_id is distinct from v_user
    or v_existing.diary_id is distinct from v_entry.diary_id
    or v_existing.type is distinct from v_entry.type
    or v_existing.text_content is distinct from v_entry.text_content
    or v_existing.music_tag is distinct from v_entry.music_tag
    or v_existing.location_tag is distinct from v_entry.location_tag
    or v_existing.metadata is distinct from v_entry.metadata
    or v_existing.attachments is distinct from v_entry.attachments
    or coalesce(v_existing.is_private, false) is distinct from coalesce(v_entry.is_private, false)
  ) then
    raise exception 'Entry ID already in use' using errcode = '23505';
  end if;
  if v_capsule.id is not null then
    if v_capsule.user_id is distinct from v_user or (
        v_capsule.reveal_type is distinct from p_capsule->>'reveal_type'
        or v_capsule.unlock_at is distinct from (p_capsule->>'unlock_at')::timestamptz
        or v_capsule.condition_label is distinct from p_capsule->>'condition_label'
    ) then
      raise exception 'Entry ID already in use' using errcode = '23505';
    end if;
    update public.entries set shared_with = array[]::varchar[], shared_with_everyone = false where id = v_entry.id and user_id = v_user returning * into v_existing;
    update public.time_capsules set creation_request = v_request where id = v_capsule.id and user_id = v_user;
    return pg_catalog.jsonb_build_object('entry', pg_catalog.to_jsonb(v_existing), 'created', false);
  end if;
  if v_existing.id is null then
    insert into public.entries (id, user_id, diary_id, type, content_url, text_content, music_tag, location_tag, is_private, shared_with_everyone, shared_with, metadata, attachments, created_at, updated_at)
    values (v_entry.id, v_user, v_entry.diary_id, v_entry.type, v_entry.content_url, v_entry.text_content, v_entry.music_tag, v_entry.location_tag, coalesce(v_entry.is_private, false), false, v_entry.shared_with, v_entry.metadata, v_entry.attachments, coalesce(v_entry.created_at, now()), coalesce(v_entry.updated_at, now()))
    returning * into v_existing;
    v_created := true;
  else
    -- Older clients could have inserted the entry without sealing it. Preserve its
    -- existing media and atomically remove sharing while creating the capsule.
    update public.entries set shared_with = array[]::varchar[], shared_with_everyone = false where id = v_entry.id and user_id = v_user returning * into v_existing;
  end if;
  insert into public.time_capsules (entry_id, user_id, reveal_type, unlock_at, condition_label, creation_request)
  values (v_existing.id, v_user, p_capsule->>'reveal_type', (p_capsule->>'unlock_at')::timestamptz, p_capsule->>'condition_label', v_request);
  return pg_catalog.jsonb_build_object('entry', pg_catalog.to_jsonb(v_existing), 'created', v_created);
end;
$$;

revoke all on function public.create_entry_time_capsule(jsonb, jsonb) from public, anon;
grant execute on function public.create_entry_time_capsule(jsonb, jsonb) to authenticated;
