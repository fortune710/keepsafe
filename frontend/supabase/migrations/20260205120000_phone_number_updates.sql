-- Create phone_number_updates table to store pending phone verification data.
-- This table is used by the client to determine whether to render the phone input
-- step or the OTP verification step in the phone-number bottom sheet.

create table if not exists public.phone_number_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_number text not null,
  otp_hash text not null,
  created_at timestamptz not null default now()
);

-- Ensure one pending phone verification per user.
create unique index if not exists phone_number_updates_user_id_key
on public.phone_number_updates (user_id);

alter table public.phone_number_updates enable row level security;

-- RLS: Users can only access their own phone number update rows.
create policy "Users can view their own phone number updates"
on public.phone_number_updates
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own phone number updates"
on public.phone_number_updates
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own phone number updates"
on public.phone_number_updates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own phone number updates"
on public.phone_number_updates
for delete
to authenticated
using (auth.uid() = user_id);

