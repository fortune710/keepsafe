import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.queues.entry_ingestion_queue_service import EntryIngestionQueueService


@pytest.fixture
def mock_supabase_client():
    return MagicMock()


@pytest.fixture
def service(monkeypatch, mock_supabase_client):
    from services.queues import entry_ingestion_queue_service as service_module

    monkeypatch.setattr(service_module, "get_supabase_client", lambda: mock_supabase_client)
    monkeypatch.setattr(service_module, "QueueService", MagicMock)
    monkeypatch.setattr(service_module, "IngestionService", MagicMock)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(service_module, "ENTRY_INGESTION_BATCH_SIZE", 10)
        mp.setattr(service_module, "ENTRY_INGESTION_DLQ_LIMIT", 3)
        mp.setattr(service_module, "ENTRY_INGESTION_CONCURRENCY", 2)
        svc = EntryIngestionQueueService()

    svc.queue_service = MagicMock()
    svc.ingestion_service = MagicMock()
    svc.ingestion_service.ingest_entry = AsyncMock(return_value=True)
    return svc


@pytest.mark.asyncio
async def test_enqueue_entry_sets_flag_and_sends_message(service, mock_supabase_client):
    entry = {"id": "entry-1", "is_enqueued": False}

    result = await service.enqueue_entry(entry)

    assert result is True
    service.queue_service.send_message.assert_called_once_with(
        queue_name="entry_ingestion_queue",
        message={"entry_id": "entry-1", "operation": "upsert", "failure_count": 0},
    )
    mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.assert_called_once()


@pytest.mark.asyncio
async def test_enqueue_entry_skips_when_already_enqueued(service):
    result = await service.enqueue_entry({"id": "entry-1", "is_enqueued": True})

    assert result is True
    service.queue_service.send_message.assert_not_called()


@pytest.mark.asyncio
async def test_process_queue_ingests_latest_entry_and_clears_enqueued_flag(service, mock_supabase_client):
    service.queue_service.read_messages.return_value = [
        {"msg_id": 7, "message": json.dumps({"entry_id": "entry-1", "operation": "upsert", "failure_count": 0})}
    ]
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "entry-1",
        "content_url": "https://example.com/file.jpg",
        "type": "photo",
        "user_id": "user-1",
        "shared_with": [],
        "attachments": [],
    }

    stats = await service.process_queue()

    assert stats == {"processed": 1, "succeeded": 1, "failed": 0, "moved_to_dlq": 0, "discarded": 0}
    service.ingestion_service.ingest_entry.assert_awaited_once()
    service.queue_service.delete_message.assert_called_once_with(queue_name="entry_ingestion_queue", message_id=7)
    assert mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.call_count == 1


@pytest.mark.asyncio
async def test_process_queue_moves_failed_message_to_dlq(service, mock_supabase_client):
    service.queue_service.read_messages.return_value = [
        {"msg_id": 8, "message": json.dumps({"entry_id": "entry-2", "operation": "upsert", "failure_count": 0})}
    ]
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "entry-2",
        "content_url": "https://example.com/file.jpg",
        "type": "photo",
        "user_id": "user-1",
        "shared_with": [],
        "attachments": [],
    }
    service.ingestion_service.ingest_entry = AsyncMock(return_value=False)

    stats = await service.process_queue()

    assert stats["processed"] == 1
    assert stats["failed"] == 1
    assert stats["moved_to_dlq"] == 1
    service.queue_service.delete_message.assert_called_once_with(queue_name="entry_ingestion_queue", message_id=8)
    service.queue_service.send_message.assert_called_once_with(
        queue_name="entry_ingestion_dlq",
        message={"entry_id": "entry-2", "operation": "upsert", "failure_count": 1},
    )
