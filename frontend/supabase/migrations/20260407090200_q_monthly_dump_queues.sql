/*
  # Monthly dump queues

  Ensures monthly dump queues exist for pgmq.
*/

create policy "anon select monthly_dump_dead_queue" on pgmq."q_monthly_dump_dead_queue" for
select
  to anon using (true);

create policy "anon insert monthly_dump_dead_queue" on pgmq."q_monthly_dump_dead_queue" for INSERT to anon
with
  check (true);

create policy "anon delete monthly_dump_dead_queue" on pgmq."q_monthly_dump_dead_queue" for DELETE to anon using (true);