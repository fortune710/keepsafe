import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class NotificationScheduler:
    """Scheduler for processing notification queue every 15 minutes."""
    
    def __init__(self):
        """
        Initialize the notification scheduler, its NotificationService, and the running state.
        
        Creates an AsyncIOScheduler assigned to `self.scheduler`, instantiates `self.notification_service`, and sets `self.is_running` to False.
        """
        self.scheduler = AsyncIOScheduler()
        self.notification_service = NotificationService()
        self.is_running = False
        self.interval_minutes = settings.NOTIFICATION_INTERVAL_MINUTES
        
    def start(self):
        """
        Start the notification scheduler to process the notification queue every 15 minutes.
        
        If the scheduler is already running this method does nothing; otherwise it schedules the recurring background job, starts the scheduler, and marks the scheduler as running.
        """
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        # Schedule queue processing every 15 minutes
        self.scheduler.add_job(
            self._process_queue_job,
            trigger=IntervalTrigger(minutes=self.interval_minutes),
            id="process_notification_queue",
            name="Process Notification Queue",
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("Notification scheduler started (runs every 15 minutes)")
    
    def stop(self):
        """
        Stop the scheduler and mark it as not running.
        
        If the scheduler is not running, the method is a no-op (a warning is logged). Otherwise it shuts down the underlying scheduler, waiting for running jobs to finish, and sets the running flag to False.
        """
        if not self.is_running:
            logger.warning("Scheduler is not running")
            return
        
        self.scheduler.shutdown(wait=True)
        self.is_running = False
        
        # Shutdown the notification service (including PostHog client)
        self.notification_service.shutdown()
        
        logger.info("Notification scheduler stopped")
    
    async def _process_queue_job(self):
        """
        Invoke the notification service to process the notification queue and record run results.
        
        Calls NotificationService.process_queue(), logs the start and completion (including returned stats), and logs any exceptions encountered.
        """
        try:
            logger.info("Starting scheduled queue processing")
            stats = await self.notification_service.process_queue()
            logger.info(f"Scheduled processing completed: {stats}")
        except Exception as e:
            logger.error(f"Error in scheduled queue processing: {str(e)}", exc_info=True)
