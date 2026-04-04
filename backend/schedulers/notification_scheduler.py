from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from queue_constants import NOTIFICATION_INTERVAL_MINUTES
from services.notification_service import NotificationService
from utils.logging import Logger

logger = Logger("NotificationScheduler")


class NotificationScheduler:
    """Scheduler for processing notification queue jobs."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.notification_service = NotificationService()
        self.is_running = False
        self.interval_minutes = NOTIFICATION_INTERVAL_MINUTES

    def start(self):
        if self.is_running:
            logger.warning("Notification scheduler is already running", {"job_id": "process_notification_queue"})
            return

        self.scheduler.add_job(
            self._process_queue_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="process_notification_queue",
            name="Process Notification Queue",
            replace_existing=True,
        )
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Notification scheduler started",
            {"job_id": "process_notification_queue", "interval_minutes": self.interval_minutes},
        )

    def stop(self):
        if not self.is_running:
            logger.warning("Notification scheduler is not running", {"job_id": "process_notification_queue"})
            return

        self.scheduler.shutdown(wait=True)
        self.is_running = False
        self.notification_service.shutdown()
        logger.info("Notification scheduler stopped", {"job_id": "process_notification_queue"})

    async def _process_queue_job(self):
        try:
            logger.info("Starting scheduled notification queue processing", {"job_id": "process_notification_queue"})
            stats = await self.notification_service.process_queue()
            logger.info("Scheduled notification processing completed", {"job_id": "process_notification_queue", "stats": stats})
        except Exception as exc:
            logger.error("Scheduled notification processing failed", {"job_id": "process_notification_queue", "error": str(exc)})
