import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from services.queues.monthly_dump_queue_service import MonthlyDumpQueueService
from services.monthly_dump_service import MonthlyDumpResult


@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.mark.asyncio
async def test_monthly_dump_queue_processes_missing_entries_as_failed():
    service = MonthlyDumpQueueService()
    
    # Mock queue messages
    queue_messages = [
        {
            "msg_id": 1,
            "message": json.dumps({
                "monthly_dump_id": "dump-1",
                "user_id": "user-A",
                "month": "2026-04",
                "random_seed": 123
            })
        }
    ]
    service.queue_service = MagicMock()
    service.queue_service.read_messages.return_value = queue_messages
    
    # Mock no entries found correctly short-circuiting
    service.dump_controller = MagicMock()
    service.dump_controller.get.return_value.data = {"status": "pending"}
    
    service.dump_service = MagicMock()
    service.dump_service.get_month_bounds.return_value = (None, None)
    service.dump_service.fetch_entries.return_value = [] # No entries!
    
    with patch("services.queues.monthly_dump_queue_service.NotificationEnqueueService") as MockNotifService:
        mock_notif_instance = AsyncMock()
        MockNotifService.return_value = mock_notif_instance
        
        stats = await service.process_queue()
        
        # Ensure it failed based on missing entries
        assert stats["failed"] == 1
        assert stats["succeeded"] == 0
        
        # Ensure notification enqueue was NOT explicitly called
        mock_notif_instance.enqueue_monthly_dump_notifications.assert_not_called()


@pytest.mark.asyncio
async def test_monthly_dump_queue_enqueues_notification_on_success():
    service = MonthlyDumpQueueService()
    
    # Mock queue messages
    queue_messages = [
        {
            "msg_id": 2,
            "message": json.dumps({
                "monthly_dump_id": "dump-2",
                "user_id": "user-B",
                "month": "2026-04",
                "random_seed": 123
            })
        },
        {
            "msg_id": 3,
            "message": json.dumps({
                "monthly_dump_id": "dump-3",
                "user_id": "user-C",
                "month": "2026-04",
                "random_seed": 123
            })
        }
    ]
    service.queue_service = MagicMock()
    service.queue_service.read_messages.return_value = queue_messages
    
    # Realistically mock finding entries
    service.dump_controller = MagicMock()
    service.dump_controller.get.return_value.data = {"status": "pending"}
    
    service.dump_service = MagicMock()
    service.dump_service.get_month_bounds.return_value = (None, None)
    service.dump_service.fetch_entries.return_value = [{"id": "entry-1"}]
    service.dump_service.build_monthly_dump.return_value = MonthlyDumpResult(
        slides=[], photo_count=1, video_count=0, audio_count=0, grid_count=0
    )
    
    with patch("services.queues.monthly_dump_queue_service.NotificationEnqueueService") as MockNotifService:
        mock_notif_instance = AsyncMock()
        MockNotifService.return_value = mock_notif_instance
        
        stats = await service.process_queue()
        
        assert stats["succeeded"] == 2
        assert stats["failed"] == 0
        
        # Check that it called the enqueue notifications logic ONLY once, for all successful users
        mock_notif_instance.enqueue_monthly_dump_notifications.assert_awaited_once_with(["user-B", "user-C"])
