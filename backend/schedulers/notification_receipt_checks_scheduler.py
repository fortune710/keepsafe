from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from queue_constants import NOTIFICATION_RECEIPT_CHECKS_INTERVAL_MINUTES
from services.notification_service import NotificationService
from utils.logging import Logger

logger = Logger("NotificationReceiptChecksScheduler")


class NotificationReceiptChecksScheduler:
    """Scheduler for processing Expo push receipt-check queue jobs."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.notification_service = NotificationService()
        self.is_running = False
        self.interval_minutes = NOTIFICATION_RECEIPT_CHECKS_INTERVAL_MINUTES

    def start(self):
        if self.is_running:
            logger.warning(
                "Notification receipt-checks scheduler is already running",
                {"job_id": "process_notification_receipt_checks_queue"},
            )
            return

        self.scheduler.add_job(
            self._process_queue_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="process_notification_receipt_checks_queue",
            name="Process Notification Receipt Checks Queue",
            replace_existing=True,
        )
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Notification receipt-checks scheduler started",
            {
                "job_id": "process_notification_receipt_checks_queue",
                "interval_minutes": self.interval_minutes,
            },
        )

    def stop(self):
        if not self.is_running:
            logger.warning(
                "Notification receipt-checks scheduler is not running",
                {"job_id": "process_notification_receipt_checks_queue"},
            )
            return

        self.scheduler.shutdown(wait=True)
        self.is_running = False
        self.notification_service.shutdown()
        logger.info(
            "Notification receipt-checks scheduler stopped",
            {"job_id": "process_notification_receipt_checks_queue"},
        )

    async def _process_queue_job(self):
        try:
            logger.info(
                "Starting scheduled notification receipt-check processing",
                {"job_id": "process_notification_receipt_checks_queue"},
            )
            stats = await self.notification_service.process_receipt_checks_queue()
            logger.info(
                "Scheduled notification receipt-check processing completed",
                {
                    "job_id": "process_notification_receipt_checks_queue",
                    "stats": stats,
                },
            )
        except Exception as exc:
            logger.error(
                "Scheduled notification receipt-check processing failed",
                {
                    "job_id": "process_notification_receipt_checks_queue",
                    "error": str(exc),
                },
            )
