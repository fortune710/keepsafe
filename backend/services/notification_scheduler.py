import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class NotificationScheduler:
    """Scheduler for processing notification queue every 15 minutes."""
    
    def __init__(self):
        """Initialize the scheduler and notification service."""
        self.scheduler = AsyncIOScheduler()
        self.notification_service = NotificationService()
        self.is_running = False
        
    def start(self):
        """Start the scheduler."""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        # Schedule queue processing every 15 minutes
        self.scheduler.add_job(
            self._process_queue_job,
            trigger=IntervalTrigger(minutes=15),
            id="process_notification_queue",
            name="Process Notification Queue",
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("Notification scheduler started (runs every 15 minutes)")
    
    def stop(self):
        """Stop the scheduler gracefully."""
        if not self.is_running:
            logger.warning("Scheduler is not running")
            return
        
        self.scheduler.shutdown(wait=True)
        self.is_running = False
        logger.info("Notification scheduler stopped")
    
    async def _process_queue_job(self):
        """Job function to process the notification queue."""
        try:
            logger.info("Starting scheduled queue processing")
            stats = await self.notification_service.process_queue()
            logger.info(f"Scheduled processing completed: {stats}")
        except Exception as e:
            logger.error(f"Error in scheduled queue processing: {str(e)}", exc_info=True)

