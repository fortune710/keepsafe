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
DECLARE
  max_attempts int := 10;
  cur_attempt int := 0;
BEGIN
  -- Set invite_code if it's NULL or an empty string
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    LOOP
      cur_attempt := cur_attempt + 1;
      NEW.invite_code := public.generate_invite_code();
      
      BEGIN
        -- Detect collision by checking existence; if exists, raise unique_violation to trigger retry
        IF EXISTS (SELECT 1 FROM public.profiles WHERE invite_code = NEW.invite_code) THEN
          RAISE unique_violation;
        END IF;
        
        EXIT; -- Successfully found a unique code
      EXCEPTION WHEN unique_violation THEN
        IF cur_attempt >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate a unique invite_code after % attempts', max_attempts;
        END IF;
        -- Continue to next iteration
      END;
    END LOOP;
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
