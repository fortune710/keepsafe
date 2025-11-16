from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def iso_to_unix_epoch(value: str) -> Optional[float]:
    """
    Convert an ISO 8601 timestamp string to Unix epoch seconds (float).

    Returns None if the value cannot be parsed.
    """
    if not value:
        return None

    try:
        iso_str = value.strip()
        # Handle common 'Z' suffix for UTC.
        if iso_str.endswith("Z"):
            iso_str = iso_str.replace("Z", "+00:00")

        dt = datetime.fromisoformat(iso_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        return dt.timestamp()
    except Exception:
        return None


