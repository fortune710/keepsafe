-- Run against a local migrated database containing at least one profile and diary.
-- The outer transaction discards all fixture data.
begin;
do $$
declare
  v_user uuid;
  v_diary uuid;
  v_id uuid := gen_random_uuid();
  v_invalid_id uuid := gen_random_uuid();
  v_legacy_id uuid := gen_random_uuid();
  v_legacy_capsule_id uuid := gen_random_uuid();
  v_default_id uuid := gen_random_uuid();
  v_entry jsonb;
  v_capsule jsonb := '{"reveal_type":"condition","unlock_at":null,"condition_label":"A milestone"}';
  v_result jsonb;
begin
  select d.user_id, d.id into v_user, v_diary from public.diaries d limit 1;
  if v_user is null then raise exception 'Seed a local user and diary before running this test'; end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  v_entry := jsonb_build_object('id', v_id, 'user_id', v_user, 'diary_id', v_diary,
    'type', 'photo', 'content_url', 'https://example.test/photo.jpg', 'shared_with', '[]'::jsonb,
    'shared_with_everyone', false, 'is_private', true, 'attachments', '[]'::jsonb);

  begin
    perform public.create_entry_time_capsule(jsonb_set(v_entry, '{id}', to_jsonb(v_invalid_id)),
      '{"reveal_type":"date","unlock_at":"2000-01-01T00:00:00Z","condition_label":null}');
    raise exception 'Expected invalid capsule to fail';
  exception when check_violation then null;
  end;
  if exists (select 1 from public.entries where id = v_invalid_id) then
    raise exception 'Failed capsule insert left an entry behind';
  end if;

  v_result := public.create_entry_time_capsule(v_entry, v_capsule);
  if v_result->>'created' is distinct from 'true' then raise exception 'First call did not create'; end if;
  v_result := public.create_entry_time_capsule(v_entry, v_capsule);
  if v_result->>'created' is distinct from 'false' then raise exception 'Replay was not recognized'; end if;
  update public.entries set is_private = false where id = v_id;
  v_result := public.create_entry_time_capsule(v_entry, v_capsule);
  if v_result->>'created' is distinct from 'false' then raise exception 'Replay failed after a privacy change'; end if;
  if (select count(*) from public.time_capsules where entry_id = v_id) <> 1 then
    raise exception 'Replay created a duplicate capsule';
  end if;
  begin
    perform public.create_entry_time_capsule(v_entry, jsonb_set(v_capsule, '{condition_label}', '"Different"'));
    raise exception 'Expected mismatched replay to fail';
  exception when unique_violation then null;
  end;
  -- Old clients could leave a shared entry without a capsule. Recovery must
  -- preserve its media, clear sharing, and be safe to replay.
  insert into public.entries (id, user_id, diary_id, type, content_url, is_private, shared_with_everyone, shared_with, attachments)
  values (v_legacy_id, v_user, v_diary, 'photo', 'https://example.test/old.jpg', true, true, array[v_user::varchar], '[]'::jsonb);
  v_result := public.create_entry_time_capsule(jsonb_set(v_entry, '{id}', to_jsonb(v_legacy_id)), v_capsule);
  if v_result->>'created' is distinct from 'false' then raise exception 'Recovery should reuse the legacy entry'; end if;
  if not exists (select 1 from public.entries where id = v_legacy_id and content_url = 'https://example.test/old.jpg' and shared_with_everyone = false and cardinality(shared_with) = 0) then
    raise exception 'Recovery changed media or failed to clear sharing';
  end if;
  perform public.create_entry_time_capsule(jsonb_set(v_entry, '{id}', to_jsonb(v_legacy_id)), v_capsule);
  begin
    perform public.create_entry_time_capsule(jsonb_set(jsonb_set(v_entry, '{id}', to_jsonb(v_legacy_id)), '{text_content}', '"different"'), v_capsule);
    raise exception 'Expected different legacy entry to be rejected';
  exception when unique_violation then null;
  end;
  -- A capsule that an older client already sealed must also replay cleanly.
  insert into public.entries (id, user_id, diary_id, type, content_url, is_private, shared_with_everyone, shared_with, attachments)
  values (v_legacy_capsule_id, v_user, v_diary, 'photo', 'https://example.test/old.jpg', true, true, array[v_user::varchar], '[]'::jsonb);
  insert into public.time_capsules (entry_id, user_id, reveal_type, condition_label)
  values (v_legacy_capsule_id, v_user, 'condition', 'A milestone');
  v_result := public.create_entry_time_capsule(jsonb_set(v_entry, '{id}', to_jsonb(v_legacy_capsule_id)), v_capsule);
  if v_result->>'created' is distinct from 'false' then raise exception 'Legacy capsule replay created an entry'; end if;
  perform public.create_entry_time_capsule(jsonb_set(v_entry, '{id}', to_jsonb(v_legacy_capsule_id)), v_capsule);
  if (select count(*) from public.time_capsules where entry_id = v_legacy_capsule_id) <> 1 then
    raise exception 'Legacy capsule replay created a duplicate';
  end if;
  v_result := public.create_entry_time_capsule(jsonb_set(v_entry - 'is_private', '{id}', to_jsonb(v_default_id)), v_capsule);
  if (select is_private from public.entries where id = v_default_id) is distinct from false then
    raise exception 'Missing is_private did not use the default';
  end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.create_entry_time_capsule(v_entry, v_capsule);
    raise exception 'Expected another user to be rejected';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
