import logging
from typing import Iterable, List, Optional

from schedulers.entry_ingestion_scheduler import EntryIngestionScheduler
from schedulers.notification_scheduler import NotificationScheduler
from schedulers.monthly_dump_scheduler import MonthlyDumpScheduler

logger = logging.getLogger(__name__)


class SchedulerManager:
    """Coordinates application scheduler lifecycle."""

    def __init__(self, schedulers: Optional[Iterable[object]] = None):
        self.schedulers: List[object] = list(schedulers) if schedulers is not None else [
            NotificationScheduler(),
            EntryIngestionScheduler(),
            MonthlyDumpScheduler(),
        ]

    def start(self) -> None:
        logger.info("Starting %s scheduler(s)", len(self.schedulers))
        for scheduler in self.schedulers:
            scheduler.start()

    def stop(self) -> None:
        logger.info("Stopping %s scheduler(s)", len(self.schedulers))
        for scheduler in reversed(self.schedulers):
            scheduler.stop()
