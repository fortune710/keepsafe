-- Persist the selected code-rendered cover style. Existing diaries remain unchanged visually.
alter table public.diaries
  add column if not exists style text;

update public.diaries
set style = 'none'
where style is null;

alter table public.diaries
  alter column style set default 'none',
  alter column style set not null;

alter table public.diaries
  add constraint diaries_style_check
  check (style in ('none', 'polka-dots', 'checkers', 'botanical', 'stickers'));
