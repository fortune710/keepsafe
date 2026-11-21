create table public.external_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  instagram jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.external_connections enable row level security;

create trigger update_external_connections_updated_at
  before update on public.external_connections
  for each row
  execute function public.update_updated_at_column();
