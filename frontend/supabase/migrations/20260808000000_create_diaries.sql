/*
  # User diaries

  A diary belongs to one profile. The default diary deliberately uses the user's UUID as
  its diary UUID, which gives legacy entries a stable, deterministic destination while
  additional diaries receive generated UUIDs.
*/

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  cover_color text not null default '#F59E0B' check (cover_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_diaries_user_id on public.diaries(user_id);
create unique index if not exists idx_diaries_one_default_per_user
  on public.diaries(user_id) where is_default;

alter table public.diaries enable row level security;

create policy "Users can read own diaries"
  on public.diaries for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own diaries"
  on public.diaries for insert to authenticated
  with check (auth.uid() = user_id and is_default = false);

create policy "Users can update own non-default diaries"
  on public.diaries for update to authenticated
  using (auth.uid() = user_id and is_default = false)
  with check (auth.uid() = user_id and is_default = false);

create policy "Users can delete own non-default diaries"
  on public.diaries for delete to authenticated
  using (auth.uid() = user_id and is_default = false);

-- Every existing profile receives a default diary whose ID is the profile ID.
insert into public.diaries (id, user_id, name, cover_color, is_default)
select id, id, 'My Diary', '#F59E0B', true
from public.profiles
on conflict (id) do nothing;

alter table public.entries add column if not exists diary_id uuid;

update public.entries
set diary_id = user_id
where diary_id is null;

alter table public.entries
  alter column diary_id set not null,
  add constraint entries_diary_id_fkey
    foreign key (diary_id) references public.diaries(id) on delete restrict;

create index if not exists idx_entries_diary_id on public.entries(diary_id);

-- Keep newly created profiles complete: their default diary is ready before the first entry.
create or replace function public.create_default_diary_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.diaries (id, user_id, name, cover_color, is_default)
  values (new.id, new.id, 'My Diary', '#F59E0B', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_default_diary_for_profile on public.profiles;
create trigger create_default_diary_for_profile
  after insert on public.profiles
  for each row execute function public.create_default_diary_for_profile();
