import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from queue_constants import TIME_CAPSULE_INTERVAL_MINUTES
from services.time_capsule_unlock_service import TimeCapsuleUnlockService

logger = logging.getLogger(__name__)


class TimeCapsuleScheduler:
    """Scheduler for unlocking due time capsules (date-based auto-unlock and completed
    release waits) and enqueuing their unlock notifications.

    A single bulk-update job is used rather than the monthly-dump two-stage enqueue+queue
    pattern - unlocking a capsule is a cheap, idempotent status flip with no per-item variable
    cost to isolate into a durable queue, unlike building a monthly dump.
    """

    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler()
        self.unlock_service = TimeCapsuleUnlockService()
        self.is_running = False
        self.interval_minutes = TIME_CAPSULE_INTERVAL_MINUTES

    def start(self) -> None:
        if self.is_running:
            logger.warning(
                "Time capsule scheduler is already running",
                extra={"job_id": "unlock_time_capsules"},
            )
            return

        self.scheduler.add_job(
            self._run_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="unlock_time_capsules",
            name="Unlock Time Capsules",
            replace_existing=True,
        )
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Time capsule scheduler started",
            extra={"job_id": "unlock_time_capsules", "interval_minutes": self.interval_minutes},
        )

    def stop(self) -> None:
        if not self.is_running:
            logger.warning(
                "Time capsule scheduler is not running",
                extra={"job_id": "unlock_time_capsules"},
            )
            return

        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info(
            "Time capsule scheduler stopped",
            extra={"job_id": "unlock_time_capsules"},
        )

    async def _run_job(self) -> None:
        try:
            stats = await self.unlock_service.process_due_capsules()
            logger.info(
                "Scheduled time capsule unlock run completed",
                extra={"job_id": "unlock_time_capsules", "stats": stats},
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Scheduled time capsule unlock run failed",
                extra={"job_id": "unlock_time_capsules", "error": str(exc)},
            )
