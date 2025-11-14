/*
  # Fix Profile Creation Issues

  1. Database Function
    - Create `handle_new_user()` function with SECURITY DEFINER
    - Automatically creates profile when new user signs up
    - Runs with elevated privileges to bypass RLS

  2. Database Trigger
    - Trigger on `auth.users` table after INSERT
    - Calls `handle_new_user()` function automatically

  3. Changes
    - Removes need for client-side profile creation
    - Ensures profile always exists for authenticated users
    - Fixes RLS policy violations during signup
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url, bio)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bio', NULL)
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;