-- Run against a local migrated database containing at least one profile and diary.
-- The outer transaction discards all fixture data.
begin;
do $$
declare
  v_user uuid;
  v_diary uuid;
  v_id uuid := gen_random_uuid();
  v_invalid_id uuid := gen_random_uuid();
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
  if v_result->>'created' <> 'true' then raise exception 'First call did not create'; end if;
  v_result := public.create_entry_time_capsule(v_entry, v_capsule);
  if v_result->>'created' <> 'false' then raise exception 'Replay was not recognized'; end if;
  if (select count(*) from public.time_capsules where entry_id = v_id) <> 1 then
    raise exception 'Replay created a duplicate capsule';
  end if;
  begin
    perform public.create_entry_time_capsule(v_entry, jsonb_set(v_capsule, '{condition_label}', '"Different"'));
    raise exception 'Expected mismatched replay to fail';
  exception when unique_violation then null;
  end;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  begin
    perform public.create_entry_time_capsule(v_entry, v_capsule);
    raise exception 'Expected another user to be rejected';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
