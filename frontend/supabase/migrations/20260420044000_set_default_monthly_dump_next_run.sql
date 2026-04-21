/*
  # Set Default for Monthly Dump Next Run

  Sets the default value for `monthly_dump_next_run` to the upcoming 3rd to last
  day of any month. If that date has already passed for the current month, the
  default advances by one month so new profiles always receive a future timestamp.
*/

ALTER TABLE public.profiles
ALTER COLUMN monthly_dump_next_run
SET DEFAULT (
  CASE
    WHEN (date_trunc('month', now()) + interval '1 month' - interval '3 days') <= now()
    THEN (date_trunc('month', now()) + interval '1 month' - interval '3 days') + interval '1 month'
    ELSE (date_trunc('month', now()) + interval '1 month' - interval '3 days')
  END
)::timestamptz;
