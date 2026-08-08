-- Extend the code-rendered cover style catalog without changing existing selections.
alter table public.diaries
  drop constraint if exists diaries_style_check;

alter table public.diaries
  add constraint diaries_style_check
  check (style in (
    'none',
    'celestial',
    'terrazzo',
    'wavy-lines',
    'ribbon',
    'polka-dots',
    'checkers',
    'botanical',
    'stickers'
  ));
