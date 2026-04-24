from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, Any, Dict, List
from controllers.entry_controller import EntryController
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user
from utils.dumps.dump_utils import normalize_month
import calendar
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user/{user_id}/entries", tags=["entries"])

@router.get("/{month}")
async def get_entries_by_month(
    user_id: str,
    month: str,
    type: Optional[str] = Query(None, regex="^(photo|video|audio)$", description="Filter by type (photo, video, audio)"),
    page: int = Query(1, ge=1),
    current_user=Depends(get_current_user)
):
    """
    Get all entries for a particular month with pagination and optional type filtering.
    """
    # 1. Authorization check
    if current_user.user.id != user_id:
        logger.warning(f"Unauthorized access attempt: User {current_user.user.id} tried to access entries for {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access these entries")

    # 2. Input sanitization/normalization
    try:
        norm_month = normalize_month(month)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")
    
    # 3. Calculate date range for the month
    try:
        year, month_num = map(int, norm_month.split("-"))
        num_days = calendar.monthrange(year, month_num)[1]
        start_utc = f"{year:04d}-{month_num:02d}-01T00:00:00Z"
        end_utc = f"{year:04d}-{month_num:02d}-{num_days:02d}T23:59:59.999Z"
    except Exception as e:
        logger.error(f"Error calculating month range: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid month format")

    # 4. Pagination & Fetching
    limit = 10
    offset = (page - 1) * limit
    
    supabase = get_supabase_client()
    controller = EntryController(supabase)
    
    try:
        response = controller.fetch_user_entries_by_month(
            user_id=user_id,
            start_utc_iso=start_utc,
            end_utc_iso=end_utc,
            entry_type=type,
            limit=limit,
            offset=offset
        )
        
        return {
            "status": "success",
            "data": {
                "entries": response.data,
                "pagination": {
                    "total": response.count,
                    "page": page,
                    "limit": limit,
                    "has_more": (offset + limit) < (response.count if response.count is not None else 0)
                }
            }
        }
    except Exception as e:
        logger.exception("Failed to fetch entries", extra={
            "user_id": user_id,
            "month": month,
            "type": type,
            "page": page,
        })
        raise HTTPException(status_code=500, detail="Internal server error while fetching entries")
