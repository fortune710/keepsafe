-- Create entry_reports table for users to report entries.
create table if not exists public.entry_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (user_id, entry_id)
);

create index if not exists entry_reports_user_id_idx
on public.entry_reports (user_id);

create index if not exists entry_reports_entry_id_idx
on public.entry_reports (entry_id);

alter table public.entry_reports enable row level security;

create policy "Users can view their own entry reports"
on public.entry_reports
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own entry reports"
on public.entry_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own entry reports"
on public.entry_reports
for delete
to authenticated
using (auth.uid() = user_id);
