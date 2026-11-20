-- Match the diary list and diary entry query predicates and sort order.
create index if not exists idx_diaries_user_default_created
  on public.diaries (user_id, is_default desc, created_at asc);

create index if not exists idx_entries_user_diary_created
  on public.entries (user_id, diary_id, created_at desc);

-- Shared vault reads use array containment before sorting newest-first.
create index if not exists idx_entries_shared_with_gin
  on public.entries using gin (shared_with);

create index if not exists idx_entries_user_created
  on public.entries (user_id, created_at desc);
