-- Create RPC function to verify OTP and update phone number in a single transaction.
-- This function enforces server-side OTP validation and prevents bypass attacks.

-- Enable pgcrypto extension for SHA-256 hashing (if not already enabled)
create extension if not exists pgcrypto;

create or replace function public.rpc_verify_and_update_phone(
  p_user_id uuid,
  p_phone_number text,
  p_raw_otp text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_update_record record;
  v_otp_hash text;
  v_result jsonb;
begin
  -- Enforce RLS: ensure the user can only verify their own phone number
  if auth.uid() is null or auth.uid() != p_user_id then
    raise exception 'Unauthorized: You can only verify your own phone number';
  end if;

  -- Look up the phone_number_updates record
  select id, phone_number, otp_hash, created_at
  into v_update_record
  from public.phone_number_updates
  where user_id = p_user_id
    and phone_number = p_phone_number
  for update; -- Lock the row for update

  -- Check if record exists
  if v_update_record is null then
    raise exception 'No pending phone verification found for this phone number';
  end if;

  -- Check expiration (10 minutes)
  if v_update_record.created_at < now() - interval '10 minutes' then
    raise exception 'OTP has expired. OTPs are valid for 10 minutes.';
  end if;

  -- Compute SHA-256 hash of the provided OTP
  v_otp_hash := encode(digest(p_raw_otp, 'sha256'), 'hex');

  -- Verify the OTP hash matches
  if v_otp_hash != v_update_record.otp_hash then
    raise exception 'Invalid OTP code';
  end if;

  -- Update the profile phone number
  update public.profiles
  set phone_number = p_phone_number,
      updated_at = now()
  where id = p_user_id;

  -- Check if profile update succeeded
  if not found then
    raise exception 'Profile not found';
  end if;

  -- Delete the phone_number_updates record
  delete from public.phone_number_updates
  where id = v_update_record.id;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Phone number verified and updated successfully'
  );

  return v_result;

exception
  when others then
    -- Return error result
    return jsonb_build_object(
      'success', false,
      'message', sqlerrm
    );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.rpc_verify_and_update_phone(uuid, text, text) to authenticated;

-- Revoke execute from public (only authenticated users can call)
revoke execute on function public.rpc_verify_and_update_phone(uuid, text, text) from public;
