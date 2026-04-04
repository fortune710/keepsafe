from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from queue_constants import ENTRY_INGESTION_INTERVAL_MINUTES
from services.queues.entry_ingestion_queue_service import EntryIngestionQueueService
from utils.logging import Logger

logger = Logger("EntryIngestionScheduler")


class EntryIngestionScheduler:
    """Scheduler for processing queued entry ingestion jobs."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.entry_ingestion_service = EntryIngestionQueueService()
        self.interval_minutes = ENTRY_INGESTION_INTERVAL_MINUTES
        self.is_running = False

    def start(self):
        if self.is_running:
            logger.warning("Entry ingestion scheduler is already running", {"job_id": "process_entry_ingestion_queue"})
            return

        self.scheduler.add_job(
            self._process_queue_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="process_entry_ingestion_queue",
            name="Process Entry Ingestion Queue",
            replace_existing=True,
        )
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Entry ingestion scheduler started",
            {"job_id": "process_entry_ingestion_queue", "interval_minutes": self.interval_minutes},
        )

    def stop(self):
        if not self.is_running:
            logger.warning("Entry ingestion scheduler is not running", {"job_id": "process_entry_ingestion_queue"})
            return

        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info("Entry ingestion scheduler stopped", {"job_id": "process_entry_ingestion_queue"})

    async def _process_queue_job(self):
        try:
            logger.info("Starting scheduled entry ingestion queue processing", {"job_id": "process_entry_ingestion_queue"})
            stats = await self.entry_ingestion_service.process_queue()
            logger.info("Scheduled entry ingestion processing completed", {"job_id": "process_entry_ingestion_queue", "stats": stats})
        except Exception as exc:
            logger.error("Scheduled entry ingestion processing failed", {"job_id": "process_entry_ingestion_queue", "error": str(exc)})
