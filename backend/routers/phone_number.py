import asyncio
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user
from twilio.rest import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user/phone", tags=["phone"])

# OTP expiration window in minutes
EXPIRATION_MINUTES = 10


class StartPhoneOtpRequest(BaseModel):
    """Request payload for starting a phone-number OTP verification flow."""

    phone_number: str = Field(..., description="E.164 phone number (e.g. +15551234567).")


class ResendPhoneOtpRequest(BaseModel):
    """Request payload for resending a phone-number OTP."""

    phone_number: str | None = Field(
        default=None,
        description="Optional E.164 phone number. If omitted, the stored pending phone number is used.",
    )


class VerifyPhoneOtpRequest(BaseModel):
    """Request payload for verifying a phone-number OTP."""

    phone_number: str = Field(..., description="E.164 phone number (e.g. +15551234567).")
    otp: str = Field(..., description="6-digit OTP code.")


def _generate_6_digit_otp() -> str:
    """
    Generate a 6-digit numeric OTP as a string.

    Returns:
        str: A zero-padded 6-digit OTP (e.g. "042381").
    """
    return str(secrets.randbelow(1_000_000)).zfill(6)


def _sha256_hex(value: str) -> str:
    """
    Compute the SHA-256 hex digest for an input string.

    Parameters:
        value (str): Input string to hash.

    Returns:
        str: Lowercase hex SHA-256 digest.
    """
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def _send_sms_otp(phone_number: str, otp: str) -> None:
    """
    Send an OTP SMS to a phone number using Twilio's REST API.

    Parameters:
        phone_number (str): Destination phone number in E.164 format.
        otp (str): 6-digit OTP to send.

    Raises:
        HTTPException: If Twilio credentials are missing or the API call fails.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        raise HTTPException(status_code=500, detail="Twilio is not configured on the backend")

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    try:
        await asyncio.to_thread(
            client.messages.create,
            to=phone_number,
            from_=settings.TWILIO_FROM_NUMBER,
            body=f"Your Keepsafe verification code is: {otp}",
        )
        phone_number_masked = f"...{phone_number[-4:]}" if phone_number and len(phone_number) >= 4 else "****"
        logger.info("Twilio send successful", extra={"phone_number": phone_number_masked})
    except Exception as e:
        phone_number_masked = f"...{phone_number[-4:]}" if phone_number and len(phone_number) >= 4 else "****"
        logger.exception("Twilio send failed", extra={"phone_number": phone_number_masked})
        raise HTTPException(status_code=500, detail="Failed to send OTP SMS") from e
    
@router.post("/otp/start")
async def start_phone_otp(
    payload: StartPhoneOtpRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """
    Create or replace a pending `phone_number_updates` row and send an OTP SMS.

    The row is upserted on `user_id` so each user has at most one pending verification record.
    """
    user_id = current_user.user.id
    otp = _generate_6_digit_otp()
    otp_hash = _sha256_hex(otp)

    phone_number_masked = f"...{payload.phone_number[-4:]}" if payload.phone_number and len(payload.phone_number) >= 4 else "****"
    logger.info("Sending OTP SMS", extra={"phone_number": phone_number_masked})
    await _send_sms_otp(payload.phone_number, otp)


    # Upsert the verification record
    now_iso = datetime.now(timezone.utc).isoformat()
    try:

        phone_number_masked = f"...{payload.phone_number[-4:]}" if payload.phone_number and len(payload.phone_number) >= 4 else "****"
        logger.info("Upserting phone_number_updates row", extra={"user_id": user_id, "phone_number": phone_number_masked, "created_at": now_iso})
        supabase.table("phone_number_updates").upsert(
            {
                "user_id": user_id,
                "phone_number": payload.phone_number,
                "otp_hash": otp_hash,
                "created_at": now_iso,
            },
            on_conflict="user_id",
        ).execute()
    except Exception as e:
        logger.exception("Failed to upsert phone_number_updates row")
        raise HTTPException(status_code=500, detail="Failed to create phone verification record") from e


    return {"message": "OTP sent"}


@router.post("/otp/resend")
async def resend_phone_otp(
    payload: ResendPhoneOtpRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """
    Resend a phone-number OTP by regenerating the OTP hash and sending a new SMS.

    If `phone_number` is not provided in the request body, the stored pending phone number is used.
    """
    user_id = current_user.user.id

    phone_number = payload.phone_number
    if not phone_number:
        try:
            res = (
                supabase.table("phone_number_updates")
                .select("phone_number")
                .eq("user_id", user_id)
                .execute()
            )
        except Exception as e:
            logger.exception("Failed to fetch existing phone_number_updates row")
            raise HTTPException(status_code=500, detail="Failed to fetch pending phone verification record") from e

        if not res.data:
            raise HTTPException(status_code=404, detail="No pending phone verification record found")

        phone_number = res.data[0].get("phone_number")

    otp = _generate_6_digit_otp()
    otp_hash = _sha256_hex(otp)
    now_iso = datetime.now(timezone.utc).isoformat()

    await _send_sms_otp(phone_number, otp)

    try:
        phone_number_masked = f"...{phone_number[-4:]}" if phone_number and len(phone_number) >= 4 else "****"
        logger.info("Upserting phone_number_updates row for resend", extra={"user_id": user_id, "phone_number": phone_number_masked, "created_at": now_iso})
        supabase.table("phone_number_updates").upsert(
            {
                "user_id": user_id,
                "phone_number": phone_number,
                "otp_hash": otp_hash,
                "created_at": now_iso,
            },
            on_conflict="user_id",
        ).execute()
    except Exception as e:
        logger.exception("Failed to upsert phone_number_updates row for resend")
        raise HTTPException(status_code=500, detail="Failed to recreate phone verification record") from e

    return {"message": "OTP resent"}


@router.post("/otp/verify")
async def verify_phone_otp(
    payload: VerifyPhoneOtpRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase_client),
):
    """
    [DEPRECATED] Verify a phone-number OTP and update the user's phone number.
    
    This endpoint is deprecated. Use the RPC function `rpc_verify_and_update_phone` 
    via Supabase client instead, which provides atomic transaction guarantees and 
    expiration checking.
    
    This endpoint:
    1. Looks up the phone_number_updates record for the user
    2. Checks if the OTP has expired (10 minute window)
    3. Verifies the provided OTP against the stored hash
    4. Updates the user's profile phone_number
    5. Deletes the phone_number_updates record upon success
    """
    user_id = current_user.user.id
    
    # Look up the phone_number_updates record
    try:
        res = (
            supabase.table("phone_number_updates")
            .select("id, phone_number, otp_hash, created_at")
            .eq("user_id", user_id)
            .eq("phone_number", payload.phone_number)
            .execute()
        )
    except Exception as e:
        logger.exception("Failed to fetch phone_number_updates row")
        raise HTTPException(status_code=500, detail="Failed to fetch phone verification record") from e
    
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="No pending phone verification found for this phone number")
    
    record = res.data[0]
    record_id = record.get("id")
    stored_otp_hash = record.get("otp_hash")
    created_at_str = record.get("created_at")
    
    # Check expiration
    try:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        expiration_time = created_at + timedelta(minutes=EXPIRATION_MINUTES)
        now = datetime.now(timezone.utc)
        
        if now > expiration_time:
            raise HTTPException(
                status_code=400,
                detail=f"OTP has expired. OTPs are valid for {EXPIRATION_MINUTES} minutes."
            )
    except ValueError as e:
        logger.exception("Failed to parse created_at timestamp")
        raise HTTPException(status_code=500, detail="Invalid timestamp in verification record") from e
    
    # Verify OTP hash
    provided_otp_hash = _sha256_hex(payload.otp.strip())
    if provided_otp_hash != stored_otp_hash:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # Update the user's profile phone number
    try:
        update_res = (
            supabase.table("profiles")
            .update({"phone_number": payload.phone_number})
            .eq("id", user_id)
            .execute()
        )
        
        if not update_res.data:
            raise HTTPException(status_code=404, detail="User profile not found")
    except Exception as e:
        logger.exception("Failed to update profile phone number")
        raise HTTPException(status_code=500, detail="Failed to update phone number") from e
    
    # Delete the phone_number_updates record
    try:
        supabase.table("phone_number_updates").delete().eq("id", record_id).execute()
    except Exception as e:
        # Log but don't fail - phone number was already updated
        logger.warning(f"Failed to delete phone_number_updates record {record_id}: {str(e)}")
    
    return {"message": "Phone number verified and updated successfully"}

