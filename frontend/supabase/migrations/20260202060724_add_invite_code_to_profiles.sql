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
UPDATE public.profiles
SET invite_code = generate_invite_code()
WHERE invite_code IS NULL;
