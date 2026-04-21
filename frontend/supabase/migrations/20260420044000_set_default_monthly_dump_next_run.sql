/*
  # Set Default for Monthly Dump Next Run
  
  Sets the default value for `monthly_dump_next_run` to the 3rd to last 
  day of the current month for all new profiles.
*/

ALTER TABLE public.profiles 
ALTER COLUMN monthly_dump_next_run 
SET DEFAULT (date_trunc('month', now()) + interval '1 month' - interval '3 days')::timestamptz;
