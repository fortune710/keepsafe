/*
  # Add Monthly Dump Next Run tracking column
  
  1. Changes
    - Add `monthly_dump_next_run` to `public.profiles`
    - Creates an index on `monthly_dump_next_run` to accelerate queries during batch enqueueing operations
  
  2. Setup
    - Adds the column as nullable.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_dump_next_run timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_monthly_dump_next_run ON public.profiles(monthly_dump_next_run);
