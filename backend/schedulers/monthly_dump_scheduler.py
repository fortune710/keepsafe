from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from queue_constants import MONTHLY_DUMP_INTERVAL_MINUTES
from services.queues.monthly_dump_queue_service import MonthlyDumpQueueService
from utils.logging import Logger

logger = Logger("MonthlyDumpScheduler")


class MonthlyDumpScheduler:
    """Scheduler for processing monthly dump queue jobs."""

    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler()
        self.queue_service = MonthlyDumpQueueService()
        self.is_running = False
        self.interval_minutes = MONTHLY_DUMP_INTERVAL_MINUTES

    def start(self) -> None:
        if self.is_running:
            logger.warning("Monthly dump scheduler is already running", {"job_id": "process_monthly_dump_queue"})
            return

        self.scheduler.add_job(
            self._process_queue_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="process_monthly_dump_queue",
            name="Process Monthly Dump Queue",
            replace_existing=True,
        )
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Monthly dump scheduler started",
            {"job_id": "process_monthly_dump_queue", "interval_minutes": self.interval_minutes},
        )

    def stop(self) -> None:
        if not self.is_running:
            logger.warning("Monthly dump scheduler is not running", {"job_id": "process_monthly_dump_queue"})
            return

        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info("Monthly dump scheduler stopped", {"job_id": "process_monthly_dump_queue"})

    async def _process_queue_job(self) -> None:
        try:
            logger.info("Starting scheduled monthly dump queue processing", {"job_id": "process_monthly_dump_queue"})
            stats = await self.queue_service.process_queue()
            logger.info(
                "Scheduled monthly dump processing completed",
                {"job_id": "process_monthly_dump_queue", "stats": stats},
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Scheduled monthly dump processing failed",
                {"job_id": "process_monthly_dump_queue", "error": str(exc)},
            )
