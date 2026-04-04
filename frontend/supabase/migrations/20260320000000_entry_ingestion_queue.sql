/*
  # Entry ingestion queue support

  1. Schema changes
    - Add `is_enqueued` to `public.entries` to track whether an ingestion job is currently queued.
*/

alter table public.entries
  add column if not exists is_enqueued boolean not null default false;

comment on column public.entries.is_enqueued is
  'Tracks whether an entry currently has a pending vector ingestion queue job.';
