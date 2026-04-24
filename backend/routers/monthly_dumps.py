import logging
import pytz
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from services.supabase_client import get_supabase_client
from services.monthly_dump_service import MonthlyDumpService
from services.queues.monthly_dump_queue_service import MonthlyDumpQueueService
from services.storage_service import StorageService
from utils.auth import get_current_user
from utils.rate_limit import rate_limit
from utils.dumps.dump_utils import normalize_month, month_to_date, hydrate_monthly_dump_slides
from controllers.monthly_dump_controller import MonthlyDumpController

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monthly-dumps", tags=["monthly-dumps"])

class CreateMonthlyDumpRequest(BaseModel):
    user_id: str
    month: Optional[str] = None
    timezone: Optional[str] = None
    force: Optional[bool] = False

@router.post("", status_code=status.HTTP_201_CREATED)
@rate_limit(requests_per_minute=5, context="create_dump")
async def create_monthly_dump(
    request: Request,
    payload: CreateMonthlyDumpRequest,
    current_user=Depends(get_current_user),
):
    """
    Create a new monthly dump for a user.
    All parameters are passed in the request body.
    """
    user_id = payload.user_id
    
    # Auth check: Ensure user is creating for themselves
    if current_user.user.id != user_id:
        logger.warning(
            "Unauthorized dump creation attempt",
            extra={"actor_user_id": current_user.user.id, "target_user_id": user_id}
        )
        raise HTTPException(status_code=403, detail="Not authorized to create dump for this user")

    month = normalize_month(payload.month)
    timezone_name = payload.timezone or "UTC"
    
    try:
        pytz.timezone(timezone_name)
    except pytz.UnknownTimeZoneError:
        raise HTTPException(status_code=400, detail="Invalid timezone. Use a valid IANA timezone string (e.g. 'America/New_York')")

    bucket_name = "monthly_dumps"
    force = bool(payload.force)
    
    logger.info(
        "Monthly dump request received",
        extra={"user_id": user_id, "month": month, "timezone": timezone_name, "force": force},
    )

    supabase = get_supabase_client()
    controller = MonthlyDumpController(supabase)
    storage_service = StorageService(supabase, bucket_name)
    month_date = month_to_date(month)

    existing_response = controller.get_dump(user_id, month_date, timezone_name)
    existing = existing_response.data if existing_response else None

    queue_service = MonthlyDumpQueueService()

    if existing and existing.get("status") == "completed" and not force:
        slides = hydrate_monthly_dump_slides(storage_service, existing.get("slides") or [])
        return {"status": "completed", "slides": slides}

    if existing and existing.get("status") in {"pending", "processing"} and not force:
        return {"status": existing.get("status")}

    data_to_reset = {
        "status": "pending",
        "slides": [],
        "photo_count": 0,
        "video_count": 0,
        "audio_count": 0,
        "grid_count": 0,
        "error": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }

    if existing:
        monthly_dump_id = existing.get("id")
        controller.update_status(monthly_dump_id, "pending", data_to_reset)
    else:
        monthly_dump_id = str(uuid.uuid4())
        controller.create({
            "id": monthly_dump_id,
            "user_id": user_id,
            "month": month_date,
            "timezone": timezone_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **data_to_reset
        })

    enqueued = queue_service.enqueue_dump(monthly_dump_id, user_id, month, timezone_name)
    if not enqueued:
        controller.update_status(monthly_dump_id, "failed", {"error": "Queue failure", "updated_at": datetime.now(timezone.utc).isoformat()})
        raise HTTPException(status_code=500, detail="Failed to enqueue dump")

    return {"status": "pending", "monthly_dump_id": monthly_dump_id}

@router.get("/{user_id}")
@rate_limit(requests_per_minute=20, context="get_dump")
async def get_monthly_dump(
    request: Request,
    user_id: str,
    month: str,
    timezone: Optional[str] = "UTC",
    current_user=Depends(get_current_user),
):
    """
    Get a completed monthly dump.
    user_id is in path, month and timezone are query parameters.
    """
    
    if current_user.user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    month = normalize_month(month)
    month_date = month_to_date(month)

    supabase = get_supabase_client()
    controller = MonthlyDumpController(supabase)
    storage_service = StorageService(supabase, "monthly_dumps")
    response = controller.get_dump(user_id, month_date, timezone)

    if not response or not response.data:
        raise HTTPException(status_code=404, detail="Monthly dump not found")

    dump = response.data
    slides = hydrate_monthly_dump_slides(storage_service, dump.get("slides") or [])

    return {"status": dump.get("status"), "slides": slides}
