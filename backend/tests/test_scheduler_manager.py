import os
import sys
from unittest.mock import MagicMock, patch

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from schedulers.scheduler_manager import SchedulerManager


def test_scheduler_manager_starts_all_schedulers():
    scheduler_one = MagicMock()
    scheduler_two = MagicMock()

    manager = SchedulerManager(schedulers=[scheduler_one, scheduler_two])
    manager.start()

    scheduler_one.start.assert_called_once()
    scheduler_two.start.assert_called_once()


def test_scheduler_manager_stops_all_schedulers_in_reverse_order():
    scheduler_one = MagicMock()
    scheduler_two = MagicMock()

    manager = SchedulerManager(schedulers=[scheduler_one, scheduler_two])
    manager.stop()

    scheduler_two.stop.assert_called_once()
    scheduler_one.stop.assert_called_once()


def test_scheduler_manager_builds_default_schedulers():
    with patch("schedulers.scheduler_manager.NotificationScheduler") as notification_cls, \
         patch("schedulers.scheduler_manager.EntryIngestionScheduler") as ingestion_cls, \
         patch("schedulers.scheduler_manager.MonthlyDumpScheduler") as monthly_cls:
        
        notification_scheduler = MagicMock()
        ingestion_scheduler = MagicMock()
        monthly_scheduler = MagicMock()
        
        notification_cls.return_value = notification_scheduler
        ingestion_cls.return_value = ingestion_scheduler
        monthly_cls.return_value = monthly_scheduler

        manager = SchedulerManager()

        assert manager.schedulers == [notification_scheduler, ingestion_scheduler, monthly_scheduler]
