from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

import random
import requests
import pytz
from dateutil.relativedelta import relativedelta
from PIL import Image

from services.supabase_client import get_supabase_client
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

    def __init__(self) -> None:
        self.supabase = get_supabase_client()

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
        response = (
            self.supabase.table("entries")
            .select("id,type,content_url,created_at,metadata,is_private")
            .eq("user_id", user_id)
            .eq("is_private", False)
            .gte("created_at", start_utc.isoformat())
            .lt("created_at", end_utc.isoformat())
            .execute()
        )
        return response.data or []

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
    def _load_image(url: str) -> Optional[Image.Image]:
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert("RGB")
            return image
        except Exception as exc:  # noqa: BLE001
            logger.logger.exception(
                "Failed to download image for grid",
                extra={"error": str(exc)},
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
