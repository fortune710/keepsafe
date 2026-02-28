-- Migration to prevent race conditions in invite_code generation using advisory locks
-- This ensures that concurrent transactions don't pick the same code and collide before the unique constraint is checked.

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
      
      -- Acquire a transaction-scoped advisory lock on the candidate code.
      -- This serializes concurrent transactions that happen to generate the same random code.
      -- The lock is automatically released at the end of the transaction.
      PERFORM pg_advisory_xact_lock(hashtext(NEW.invite_code)::bigint);
      
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
