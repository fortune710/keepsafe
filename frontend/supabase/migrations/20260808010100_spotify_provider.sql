create table if not exists public.spotify_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token_encrypted text not null,
  access_token_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spotify_oauth_states (
  state text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.spotify_listening_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  spotify_track_id text not null,
  played_at timestamptz not null,
  title text not null,
  artist text not null,
  album text,
  artwork_url text,
  created_at timestamptz not null default now(),
  unique (user_id, spotify_track_id, played_at)
);

alter table public.spotify_connections enable row level security;
alter table public.spotify_oauth_states enable row level security;
alter table public.spotify_listening_events enable row level security;

create policy "Users can read their Spotify listening events" on public.spotify_listening_events
  for select using (auth.uid() = user_id);

create policy "Users can delete their Spotify listening events" on public.spotify_listening_events
  for delete using (auth.uid() = user_id);
