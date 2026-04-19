from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import random
import requests
import pytz
import socket
import ipaddress
from urllib.parse import urlparse
from dateutil.relativedelta import relativedelta
from PIL import Image
from supabase import Client

from services.supabase_client import get_supabase_client
from controllers.entry_controller import EntryController
from utils.logging import Logger

logger = Logger("MonthlyDumpService")


@dataclass
class MonthlyDumpInputs:
    user_id: str
    month: str  # "YYYY-MM"
    timezone: str
    random_seed: int


@dataclass
class MonthlyDumpResult:
    slides: List[Dict[str, Any]]
    photo_count: int
    video_count: int
    audio_count: int
    grid_count: int


class MonthlyDumpService:
    """Build monthly dump slides and upload grid images to storage."""

    STORAGE_BUCKET = "monthly_dumps"
    GRID_WIDTH = 1080
    GRID_HEIGHT = 1920
    GRID_COLUMNS = 2
    GRID_ROWS = 3
    IMAGE_DURATION_SECONDS = 5
    MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_HOSTS = [
        "images.unsplash.com",
        "plus.unsplash.com",
        "commondatastorage.googleapis.com",
        "kjnuwzuhngfvdfzzaitj.supabase.co"
    ]

    def __init__(self, supabase: Optional[Client] = None) -> None:
        self.supabase = supabase or get_supabase_client()
        self.entry_controller = EntryController(self.supabase)

    def get_month_bounds(self, month: str, tz_name: str) -> Tuple[datetime, datetime]:
        """Return UTC start/end datetimes for the given month in the provided timezone."""
        try:
            year_str, month_str = month.split("-")
            year = int(year_str)
            month_num = int(month_str)
            if month_num < 1 or month_num > 12:
                raise ValueError("Invalid month")
        except Exception as exc:
            raise ValueError("month must be in YYYY-MM format") from exc

        tz = pytz.timezone(tz_name)
        start_local = tz.localize(datetime(year, month_num, 1, 0, 0, 0))
        end_local = start_local + relativedelta(months=1)
        return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)

    def fetch_entries(
        self,
        *,
        user_id: str,
        start_utc: datetime,
        end_utc: datetime,
    ) -> List[Dict[str, Any]]:
        # Use EntryController to fetch entries
        response = self.entry_controller.fetch_user_entries_in_range(
            user_id=user_id,
            start_utc_iso=start_utc.isoformat(),
            end_utc_iso=end_utc.isoformat()
        )
        # Apply the is_private=False filter as per existing logic
        entries = response.data or []
        return [e for e in entries if not e.get("is_private", False)]

    def build_monthly_dump(self, inputs: MonthlyDumpInputs) -> MonthlyDumpResult:
        start_utc, end_utc = self.get_month_bounds(inputs.month, inputs.timezone)
        logger.info(
            "Monthly dump bounds computed",
            {
                "user_id": inputs.user_id,
                "month": inputs.month,
                "timezone": inputs.timezone,
                "start_utc": start_utc.isoformat(),
                "end_utc": end_utc.isoformat(),
            },
        )

        entries = self.fetch_entries(
            user_id=inputs.user_id,
            start_utc=start_utc,
            end_utc=end_utc,
        )

        photos = [e for e in entries if e.get("type") == "photo" and e.get("content_url")]
        videos = [e for e in entries if e.get("type") == "video" and e.get("content_url")]
        audios = [e for e in entries if e.get("type") == "audio" and e.get("content_url")]

        photos.sort(key=lambda e: e.get("created_at") or "")
        logger.info(
            "Monthly dump media collected",
            {
                "user_id": inputs.user_id,
                "month": inputs.month,
                "photo_count": len(photos),
                "video_count": len(videos),
                "audio_count": len(audios),
            },
        )

        photo_chunks = self._chunk(photos, 6)
        grid_paths: List[str] = []

        for idx, chunk in enumerate(photo_chunks, start=1):
            image_urls = [c["content_url"] for c in chunk if c.get("content_url")]
            grid = self._build_grid(image_urls)
            storage_path = f"{inputs.user_id}/monthly-dumps/{inputs.month}/grid_{idx}.jpg"
            self._upload_grid(storage_path, grid)
            grid_paths.append(storage_path)

        rng = random.Random(inputs.random_seed)
        selected_videos = (
            rng.sample(videos, k=3) if len(videos) > 3 else list(videos)
        )
        selected_audios = (
            rng.sample(audios, k=3) if len(audios) > 3 else list(audios)
        )

        slides: List[Dict[str, Any]] = []
        for path in grid_paths:
            slides.append(
                {
                    "type": "image",
                    "storage_path": path,
                    "duration_seconds": self.IMAGE_DURATION_SECONDS,
                }
            )
        for entry in selected_videos:
            slides.append(
                {
                    "type": "video",
                    "url": entry.get("content_url"),
                    "entry_id": entry.get("id"),
                    "duration_seconds": self._get_duration(entry),
                }
            )
        for entry in selected_audios:
            slides.append(
                {
                    "type": "audio",
                    "url": entry.get("content_url"),
                    "entry_id": entry.get("id"),
                    "duration_seconds": self._get_duration(entry),
                }
            )

        return MonthlyDumpResult(
            slides=slides,
            photo_count=len(photos),
            video_count=len(videos),
            audio_count=len(audios),
            grid_count=len(grid_paths),
        )

    def get_signed_url(self, storage_path: str, expires_in_seconds: int = 3600) -> Optional[str]:
        try:
            response = (
                self.supabase.storage
                .from_(self.STORAGE_BUCKET)
                .create_signed_url(storage_path, expires_in_seconds)
            )
            return response.get("signedURL") or response.get("signedUrl")
        except Exception as exc:  # noqa: BLE001
            logger.logger.exception(
                "Failed to create signed URL for monthly dump grid",
                extra={"storage_path": storage_path, "error": str(exc)},
            )
            return None

    @staticmethod
    def _chunk(items: List[Dict[str, Any]], size: int) -> List[List[Dict[str, Any]]]:
        return [items[i : i + size] for i in range(0, len(items), size)]

    @classmethod
    def _build_grid(cls, image_urls: List[str]) -> Image.Image:
        grid = Image.new("RGB", (cls.GRID_WIDTH, cls.GRID_HEIGHT), (12, 12, 12))
        tile_w = cls.GRID_WIDTH // cls.GRID_COLUMNS
        tile_h = cls.GRID_HEIGHT // cls.GRID_ROWS

        for idx in range(cls.GRID_COLUMNS * cls.GRID_ROWS):
            col = idx % cls.GRID_COLUMNS
            row = idx // cls.GRID_COLUMNS
            x = col * tile_w
            y = row * tile_h

            if idx >= len(image_urls):
                continue

            img = cls._load_image(image_urls[idx])
            if img is None:
                continue
            img = cls._center_crop(img, tile_w, tile_h)
            grid.paste(img, (x, y))

        return grid

    @staticmethod
    def _is_safe_url(url: str) -> bool:
        """Verify URL uses safe protocol, resides on allowlisted host, and resolves to public IP."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False
                
            hostname = parsed.hostname
            if not hostname:
                return False
                
            # Check against allowlist
            is_allowlisted = (
                any(h in hostname for h in MonthlyDumpService.ALLOWED_IMAGE_HOSTS) or 
                ".supabase.co" in hostname
            )
            if not is_allowlisted:
                return False
                
            # SSRF Protection: Resolve and check IP
            ip_info = socket.getaddrinfo(hostname, None)
            for item in ip_info:
                ip_str = item[4][0]
                # Filter out IPv6 wrappers or malformed addresses
                if "%" in ip_str:
                    ip_str = ip_str.split("%")[0]
                ip = ipaddress.ip_address(ip_str)
                if ip.is_private or ip.is_loopback:
                    return False
            return True
        except Exception:
            return False

    @staticmethod
    def _load_image(url: str) -> Optional[Image.Image]:
        """Download image with size limits and SSRF protection."""
        if not MonthlyDumpService._is_safe_url(url):
            logger.warning("Rejected unsafe or disallowed URL for monthly dump", {"url": url})
            return None

        try:
            # Use streaming to check size before full download
            response = requests.get(url, timeout=10, stream=True, allow_redirects=True)
            
            # Double check safe hosts after redirects
            if response.history:
                for r in response.history:
                    if not MonthlyDumpService._is_safe_url(r.url):
                        logger.warning("Rejected disallowed redirect URL", {"url": r.url})
                        return None
            
            response.raise_for_status()

            # Header check for size
            cl = response.headers.get("Content-Length")
            if cl and int(cl) > MonthlyDumpService.MAX_IMAGE_BYTES:
                logger.error("Image exceeds size limit (from header)", {"url": url, "size": cl})
                return None

            # Bounded read in chunks
            buffer = BytesIO()
            total_bytes = 0
            for chunk in response.iter_content(chunk_size=8192):
                total_bytes += len(chunk)
                if total_bytes > MonthlyDumpService.MAX_IMAGE_BYTES:
                    logger.error("Image exceeds size limit during download", {"url": url})
                    return None
                buffer.write(chunk)

            buffer.seek(0)
            image = Image.open(buffer).convert("RGB")
            return image
        except Exception as exc:
            logger.logger.exception(
                "Failed to download image safely for grid",
                extra={"url": url, "error": str(exc)},
            )
            return None

    @staticmethod
    def _center_crop(image: Image.Image, target_w: int, target_h: int) -> Image.Image:
        img_w, img_h = image.size
        target_ratio = target_w / target_h
        img_ratio = img_w / img_h

        if img_ratio > target_ratio:
            new_w = int(img_h * target_ratio)
            left = (img_w - new_w) // 2
            box = (left, 0, left + new_w, img_h)
        else:
            new_h = int(img_w / target_ratio)
            top = (img_h - new_h) // 2
            box = (0, top, img_w, top + new_h)

        cropped = image.crop(box)
        return cropped.resize((target_w, target_h), Image.LANCZOS)

    def _upload_grid(self, storage_path: str, image: Image.Image) -> None:
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        buffer.seek(0)

        self.supabase.storage.from_(self.STORAGE_BUCKET).upload(
            storage_path,
            buffer.read(),
            {"content-type": "image/jpeg", "upsert": "true"},
        )
        logger.info(
            "Uploaded monthly dump grid",
            {"storage_path": storage_path},
        )

    @staticmethod
    def _get_duration(entry: Dict[str, Any]) -> int:
        metadata = entry.get("metadata") or {}
        duration = metadata.get("duration")
        try:
            if duration is None:
                return 5
            duration_val = float(duration)
            return max(1, int(round(duration_val)))
        except Exception:
            return 5
