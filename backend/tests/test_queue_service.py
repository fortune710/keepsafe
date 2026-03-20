import os
import sys
import json
from unittest.mock import MagicMock

import pytest

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.queue_service import QueueService


@pytest.fixture
def mock_supabase_client():
    mock_client = MagicMock()
    return mock_client


def test_send_message_serializes_payload(monkeypatch, mock_supabase_client):
    from services import queue_service as queue_module

    monkeypatch.setattr(queue_module, "get_supabase_client", lambda: mock_supabase_client)
    service = QueueService()

    service.send_message(queue_name="test_queue", message={"entry_id": "entry-1"})

    mock_supabase_client.schema.assert_called_once_with("pgmq_public")
    call_args = mock_supabase_client.schema.return_value.rpc.call_args
    assert call_args[0][0] == "send"
    assert call_args[0][1]["queue_name"] == "test_queue"
    assert json.loads(call_args[0][1]["message"]) == {"entry_id": "entry-1"}


def test_read_messages_returns_response_data(monkeypatch, mock_supabase_client):
    from services import queue_service as queue_module

    mock_response = MagicMock()
    mock_response.data = [{"msg_id": 1}]
    mock_supabase_client.schema.return_value.rpc.return_value.execute.return_value = mock_response
    monkeypatch.setattr(queue_module, "get_supabase_client", lambda: mock_supabase_client)

    service = QueueService()
    result = service.read_messages(
        queue_name="test_queue",
        batch_size=5,
        visibility_timeout_seconds=60,
    )

    assert result == [{"msg_id": 1}]
    call_args = mock_supabase_client.schema.return_value.rpc.call_args
    assert call_args[0][0] == "read"
    assert call_args[0][1] == {
        "queue_name": "test_queue",
        "sleep_seconds": 60,
        "n": 5,
    }


def test_delete_message_uses_queue_name(monkeypatch, mock_supabase_client):
    from services import queue_service as queue_module

    monkeypatch.setattr(queue_module, "get_supabase_client", lambda: mock_supabase_client)
    service = QueueService()

    service.delete_message(queue_name="test_queue", message_id=42)

    call_args = mock_supabase_client.schema.return_value.rpc.call_args
    assert call_args[0][0] == "delete"
    assert call_args[0][1] == {
        "queue_name": "test_queue",
        "message_id": 42,
    }
