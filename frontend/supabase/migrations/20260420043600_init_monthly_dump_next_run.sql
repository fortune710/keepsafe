/*
  # Initialize Monthly Dump Next Run
  
  Sets the default monthly_dump_next_run for all existing profiles:
  - To the 3rd-to-last day of the current month if that date hasn't passed yet
  - Otherwise, to the 3rd-to-last day of the next month
*/

UPDATE public.profiles
SET monthly_dump_next_run = (
  CASE
    WHEN now() < date_trunc('month', now()) + interval '1 month' - interval '3 days'
      THEN date_trunc('month', now()) + interval '1 month' - interval '3 days'
    ELSE date_trunc('month', now()) + interval '2 months' - interval '3 days'
  END
)::timestamptz
WHERE monthly_dump_next_run IS NULL;
