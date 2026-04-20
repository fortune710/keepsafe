from __future__ import annotations

from datetime import datetime, timezone

from PIL import Image

from services.monthly_dump_service import MonthlyDumpService, MonthlyDumpInputs


def test_get_month_bounds_uses_timezone():
    service = MonthlyDumpService()
    start_utc, end_utc = service.get_month_bounds("2026-04", "America/New_York")
    assert start_utc.tzinfo == timezone.utc
    assert end_utc.tzinfo == timezone.utc
    assert start_utc < end_utc


def test_build_monthly_dump_chunks_and_selects():
    service = MonthlyDumpService()

    def fake_fetch_entries(*, user_id: str, start_utc: datetime, end_utc: datetime):
        return [
            {"id": f"photo-{i}", "type": "photo", "content_url": f"https://example.com/{i}.jpg", "created_at": f"2026-04-0{i+1}T00:00:00Z"}
            for i in range(7)
        ] + [
            {"id": f"video-{i}", "type": "video", "content_url": f"https://example.com/v{i}.mp4", "created_at": f"2026-04-0{i+1}T00:00:00Z"}
            for i in range(5)
        ] + [
            {"id": f"audio-{i}", "type": "audio", "content_url": f"https://example.com/a{i}.mp3", "created_at": f"2026-04-0{i+1}T00:00:00Z"}
            for i in range(4)
        ]

    service.fetch_entries = fake_fetch_entries  # type: ignore[assignment]
    service._build_grid = lambda urls: Image.new("RGB", (1080, 1920))  # type: ignore[assignment]
    service._upload_grid = lambda path, image: None  # type: ignore[assignment]

    result = service.build_monthly_dump(
        MonthlyDumpInputs(
            user_id="user-1",
            month="2026-04",
            timezone="UTC",
            random_seed=123,
        )
    )

    assert result.photo_count == 7
    assert result.video_count == 5
    assert result.audio_count == 4
    assert result.grid_count == 2

    image_slides = [s for s in result.slides if s["type"] == "image"]
    video_slides = [s for s in result.slides if s["type"] == "video"]
    audio_slides = [s for s in result.slides if s["type"] == "audio"]

    assert len(image_slides) == 2
    assert len(video_slides) == 3
    assert len(audio_slides) == 3
