import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from queue_constants import MONTHLY_DUMP_ENQUEUE_INTERVAL_MINUTES
from services.queues.monthly_dump_enqueue_service import MonthlyDumpEnqueueService

logger = logging.getLogger(__name__)


class MonthlyDumpEnqueueScheduler:
    """Scheduler for automatically batching eligible monthly dump jobs."""

    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler()
        self.enqueue_service = MonthlyDumpEnqueueService()
        self.is_running = False
        self.interval_minutes = MONTHLY_DUMP_ENQUEUE_INTERVAL_MINUTES

    def start(self) -> None:
        if self.is_running:
            logger.warning(
                "Monthly dump enqueue scheduler is already running",
                extra={"job_id": "enqueue_monthly_dump_jobs"},
            )
            return

        self.scheduler.add_job(
            self._enqueue_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="enqueue_monthly_dump_jobs",
            name="Enqueue Monthly Dump Jobs",
            replace_existing=True,
        )
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Monthly dump enqueue scheduler started",
            extra={"job_id": "enqueue_monthly_dump_jobs", "interval_minutes": self.interval_minutes},
        )

    def stop(self) -> None:
        if not self.is_running:
            logger.warning(
                "Monthly dump enqueue scheduler is not running",
                extra={"job_id": "enqueue_monthly_dump_jobs"},
            )
            return

        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info(
            "Monthly dump enqueue scheduler stopped",
            extra={"job_id": "enqueue_monthly_dump_jobs"},
        )

    async def _enqueue_job(self) -> None:
        try:
            # We don't need to await because the service uses sync supabase calls
            self.enqueue_service.enqueue_eligible_users()
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Scheduled monthly dump enqueuing failed",
                extra={"job_id": "enqueue_monthly_dump_jobs", "error": str(exc)},
            )
