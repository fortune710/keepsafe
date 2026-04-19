from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import HTTPException
from services.storage_service import StorageService

def normalize_month(month: str) -> str:
    """Return YYYY-MM string or raise HTTPException."""
    try:
        if not month:
            return datetime.now(timezone.utc).strftime("%Y-%m")
        year_str, month_str = month.split("-")
        year = int(year_str)
        month_num = int(month_str)
        if month_num < 1 or month_num > 12:
            raise ValueError("month out of range")
        return f"{year:04d}-{month_num:02d}"
    except Exception as exc:
        raise HTTPException(status_code=400, detail="month must be in YYYY-MM format") from exc

def month_to_date(month: str) -> str:
    return f"{month}-01"

def hydrate_monthly_dump_slides(
    storage_service: StorageService,
    slides: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    hydrated: List[Dict[str, Any]] = []
    for slide in slides:
        if slide.get("type") == "image" and slide.get("storage_path"):
            signed_url = storage_service.get_signed_url(slide["storage_path"])
            hydrated.append({**slide, "url": signed_url})
        else:
            hydrated.append(slide)
    return hydrated
