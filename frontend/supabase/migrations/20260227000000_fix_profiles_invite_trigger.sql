-- Migration to fix profiles invite_code trigger for better robustness
-- Focuses solely on ensuring public.profiles.invite_code is generated correctly

-- 1. Redefine generate_invite_code with explicit schema qualification
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text AS $$
BEGIN
  RETURN array_to_string(
    ARRAY(
      SELECT substring('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' 
      FROM (ceil(random()*62))::int FOR 1)
      FROM generate_series(1, 8)
    ), ''
  );
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Redefine set_profile_invite_code with better checks and schema qualification
CREATE OR REPLACE FUNCTION public.set_profile_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Set invite_code if it's NULL or an empty string
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS set_profile_invite_code_trigger ON public.profiles;
CREATE TRIGGER set_profile_invite_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_invite_code();

-- 4. Backfill any existing profiles that might have missed the trigger
DO $$
DECLARE
  profile_record RECORD;
  new_code text;
  max_attempts int := 10;
  cur_attempt int;
  success boolean;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles WHERE invite_code IS NULL OR invite_code = ''
  LOOP
    success := false;
    cur_attempt := 0;
    
    WHILE NOT success AND cur_attempt < max_attempts LOOP
      cur_attempt := cur_attempt + 1;
      BEGIN
        new_code := public.generate_invite_code();
        UPDATE public.profiles
        SET invite_code = new_code
        WHERE id = profile_record.id;
        success := true;
      EXCEPTION WHEN unique_violation THEN
        -- Retry on unique constraint violation
      END;
    END LOOP;
  END LOOP;
END $$;
