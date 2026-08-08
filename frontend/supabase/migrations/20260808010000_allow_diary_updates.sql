-- Diary owners can rename and recolor both their default and custom diaries.
drop policy if exists "Users can update own non-default diaries" on public.diaries;

create policy "Users can update own diaries"
  on public.diaries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
