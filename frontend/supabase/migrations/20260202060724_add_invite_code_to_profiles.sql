-- Add invite_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Create function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
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

-- Create function to set invite code on profile creation
CREATE OR REPLACE FUNCTION set_profile_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set invite_code if it's not already provided
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set invite_code on profile creation
DROP TRIGGER IF EXISTS set_profile_invite_code_trigger ON public.profiles;
CREATE TRIGGER set_profile_invite_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_invite_code();

-- Backfill invite_code for existing profiles that don't have one
-- Process each profile individually with retry logic to handle unique constraint violations
DO $$
DECLARE
  profile_record RECORD;
  new_invite_code text;
  max_attempts int := 10;
  attempt_count int;
  success boolean;
BEGIN
  -- Iterate over each profile that needs an invite code
  FOR profile_record IN 
    SELECT id FROM public.profiles WHERE invite_code IS NULL
  LOOP
    success := false;
    attempt_count := 0;
    
    -- Retry loop to handle potential duplicate invite codes
    WHILE NOT success AND attempt_count < max_attempts LOOP
      attempt_count := attempt_count + 1;
      
      BEGIN
        -- Generate a new invite code
        new_invite_code := generate_invite_code();
        
        -- Attempt to update the profile with the new invite code
        UPDATE public.profiles
        SET invite_code = new_invite_code
        WHERE id = profile_record.id;
        
        success := true;
        
      EXCEPTION
        WHEN unique_violation THEN
          -- If we hit a duplicate, retry with a new code
          IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invite_code for profile % after % attempts', 
              profile_record.id, max_attempts;
          END IF;
          -- Continue to next iteration to retry
      END;
    END LOOP;
  END LOOP;
END $$;
