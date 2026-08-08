-- Store the user-selected diary cover color under the product-facing column name.
alter table public.diaries
  add column if not exists color text;

update public.diaries
set color = cover_color
where color is null;

alter table public.diaries
  alter column color set default '#F59E0B',
  alter column color set not null;

alter table public.diaries
  add constraint diaries_color_format_check
  check (color ~ '^#[0-9A-Fa-f]{6}$');
