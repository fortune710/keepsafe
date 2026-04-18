/*
  # Monthly dumps

  1. New Tables
    - monthly_dumps
  2. Security
    - Enable RLS
    - Policies for owner access
  3. Storage
    - monthly_dumps bucket + policies
*/

create table if not exists public.monthly_dumps (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  timezone text not null,
  status text not null,
  slides jsonb,
  photo_count integer not null default 0,
  video_count integer not null default 0,
  audio_count integer not null default 0,
  grid_count integer not null default 0,
  random_seed integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists idx_monthly_dumps_user_month_tz
  on public.monthly_dumps(user_id, month, timezone);

alter table public.monthly_dumps enable row level security;

create policy "Users can read own monthly dumps"
  on public.monthly_dumps
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own monthly dumps"
  on public.monthly_dumps
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own monthly dumps"
  on public.monthly_dumps
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own monthly dumps"
  on public.monthly_dumps
  for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger update_monthly_dumps_updated_at
  before update on public.monthly_dumps
  for each row
  execute function update_updated_at_column();

insert into storage.buckets (id, name, public)
values ('monthly_dumps', 'monthly_dumps', false)
on conflict (id) do nothing;

create policy "Users can read own monthly dumps"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'monthly_dumps'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own monthly dumps"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'monthly_dumps'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own monthly dumps"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'monthly_dumps'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own monthly dumps"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'monthly_dumps'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
