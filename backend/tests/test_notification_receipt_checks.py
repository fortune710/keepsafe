import json
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.notification_service import NotificationService
from queue_constants import NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME


@pytest.fixture
def mock_supabase_client():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = None

    mock_schema = MagicMock()
    mock_rpc_result = MagicMock()
    mock_rpc_result.execute.return_value = mock_response
    mock_schema.rpc.return_value = mock_rpc_result
    mock_client.schema.return_value = mock_schema
    mock_client.rpc.return_value.execute.return_value = mock_response
    return mock_client


@pytest.fixture
def notification_service(monkeypatch, mock_supabase_client):
    from services import notification_service as notification_module

    monkeypatch.setattr(
        notification_module,
        "get_supabase_client",
        lambda: mock_supabase_client,
    )
    monkeypatch.setattr(notification_module, "Posthog", MagicMock)

    with patch("services.notification_service.settings") as mock_settings:
        mock_settings.POSTHOG_API_KEY = "test_key"
        mock_settings.POSTHOG_HOST = "https://test.posthog.com"

        service = NotificationService()
        service.supabase = mock_supabase_client
        return service


def _mock_httpx_post(response_json):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = response_json

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.post = AsyncMock(return_value=mock_response)
    return mock_client


@pytest.mark.asyncio
async def test_ok_tickets_are_enqueued_to_receipt_checks_queue(notification_service):
    """After Expo returns ticket status=ok, enqueue ticket_id + token for receipt checks."""
    token_a = "ExponentPushToken[aaa]"
    token_b = "ExponentPushToken[bbb]"
    ticket_a = "ticket-aaa"
    ticket_b = "ticket-bbb"

    notification_service.queue_service.send_message = MagicMock(
        return_value=MagicMock(data={"msg_id": 1})
    )
    notification_service.queue_service.is_enqueue_response_valid = MagicMock(
        return_value=True
    )

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {
                "data": [
                    {"status": "ok", "id": ticket_a},
                    {"status": "ok", "id": ticket_b},
                ]
            }
        )

        result = await notification_service._send_notification(
            title="Hello",
            body="World",
            recipients=[token_a, token_b],
            priority="default",
        )

    assert result is True

    receipt_enqueue_calls = [
        c
        for c in notification_service.queue_service.send_message.call_args_list
        if c.kwargs.get("queue_name") == NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME
        or (c.args and c.args[0] == NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME)
    ]
    # Prefer kwargs style used by QueueService.send_message
    receipt_enqueue_calls = [
        c
        for c in notification_service.queue_service.send_message.call_args_list
        if c.kwargs.get("queue_name") == NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME
    ]

    assert len(receipt_enqueue_calls) == 2
    enqueued = [c.kwargs["message"] for c in receipt_enqueue_calls]
    assert {"ticket_id": ticket_a, "token": token_a} in enqueued
    assert {"ticket_id": ticket_b, "token": token_b} in enqueued


@pytest.mark.asyncio
async def test_error_tickets_are_not_enqueued_to_receipt_checks_queue(
    notification_service, mock_supabase_client
):
    """DeviceNotRegistered tickets are handled immediately and not sent to receipt checks."""
    dead_token = "ExponentPushToken[dead]"

    notification_service.queue_service.send_message = MagicMock(
        return_value=MagicMock(data={"msg_id": 1})
    )
    update_chain = MagicMock()
    mock_supabase_client.table.return_value.update.return_value = update_chain
    update_chain.in_.return_value.execute.return_value = MagicMock(
        data=[{"token": dead_token}]
    )

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {
                "data": [
                    {
                        "status": "error",
                        "message": f'"{dead_token}" is not a registered push notification recipient',
                        "details": {"error": "DeviceNotRegistered"},
                    }
                ]
            }
        )

        result = await notification_service._send_notification(
            title="Hello",
            body="World",
            recipients=[dead_token],
            priority="default",
        )

    assert result is True
    receipt_enqueue_calls = [
        c
        for c in notification_service.queue_service.send_message.call_args_list
        if c.kwargs.get("queue_name") == NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME
    ]
    assert receipt_enqueue_calls == []


@pytest.mark.asyncio
async def test_receipt_ok_removes_message_from_receipt_checks_queue(notification_service):
    """Receipt status=ok with no issue → delete the receipt-check queue message."""
    msg_id = 42
    ticket_id = "ticket-ok-1"
    token = "ExponentPushToken[ok]"

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "message": json.dumps({"ticket_id": ticket_id, "token": token}),
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {"data": {ticket_id: {"status": "ok"}}}
        )
        stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["succeeded"] == 1
    assert stats["kept"] == 0
    notification_service.queue_service.delete_message.assert_called_once_with(
        queue_name=NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME,
        message_id=msg_id,
    )


@pytest.mark.asyncio
async def test_receipt_error_removes_message_from_receipt_checks_queue(
    notification_service, mock_supabase_client
):
    """Receipt status=error → apply side effects and delete the queue message."""
    msg_id = 43
    ticket_id = "ticket-err-1"
    token = "ExponentPushToken[dead]"

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "message": {"ticket_id": ticket_id, "token": token},
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()

    update_chain = MagicMock()
    mock_supabase_client.table.return_value.update.return_value = update_chain
    update_chain.in_.return_value.execute.return_value = MagicMock(
        data=[{"token": token}]
    )

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {
                "data": {
                    ticket_id: {
                        "status": "error",
                        "message": f'"{token}" is not a registered push notification recipient',
                        "details": {"error": "DeviceNotRegistered"},
                    }
                }
            }
        )
        stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["succeeded"] == 1
    assert stats["kept"] == 0
    mock_supabase_client.table.return_value.update.assert_called_with({"inactive": True})
    notification_service.queue_service.delete_message.assert_called_once_with(
        queue_name=NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME,
        message_id=msg_id,
    )


@pytest.mark.asyncio
async def test_missing_receipt_keeps_message_in_receipt_checks_queue(notification_service):
    """No receipt yet → do not delete; message remains for a later poll."""
    msg_id = 44
    ticket_id = "ticket-pending-1"
    token = "ExponentPushToken[pending]"

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "message": {"ticket_id": ticket_id, "token": token},
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()

    with patch("httpx.AsyncClient") as mock_client_class:
        # Expo returns an empty map / no entry for this ticket id yet
        mock_client_class.return_value = _mock_httpx_post({"data": {}})
        stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["kept"] == 1
    assert stats["succeeded"] == 0
    notification_service.queue_service.delete_message.assert_not_called()


@pytest.mark.asyncio
async def test_message_rate_exceeded_receipt_pauses_token(
    notification_service, mock_supabase_client
):
    """MessageRateExceeded receipt → set paused=true, then remove from queue."""
    msg_id = 45
    ticket_id = "ticket-rate-1"
    token = "ExponentPushToken[rate]"

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "message": {"ticket_id": ticket_id, "token": token},
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()

    update_chain = MagicMock()
    mock_supabase_client.table.return_value.update.return_value = update_chain
    update_chain.in_.return_value.execute.return_value = MagicMock(
        data=[{"token": token}]
    )

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {
                "data": {
                    ticket_id: {
                        "status": "error",
                        "message": "Rate exceeded",
                        "details": {"error": "MessageRateExceeded"},
                    }
                }
            }
        )
        stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["succeeded"] == 1
    update_payload = mock_supabase_client.table.return_value.update.call_args[0][0]
    assert update_payload["paused"] is True
    assert "paused_at" in update_payload
    notification_service.queue_service.delete_message.assert_called_once_with(
        queue_name=NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME,
        message_id=msg_id,
    )


@pytest.mark.asyncio
async def test_receipt_enqueue_failure_fails_send(notification_service):
    """If receipt-check enqueue fails, the send must fail so the notification is not deleted."""
    notification_service.queue_service.send_message = MagicMock(
        return_value=MagicMock(data=None)
    )
    notification_service.queue_service.is_enqueue_response_valid = MagicMock(
        return_value=False
    )

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {"data": [{"status": "ok", "id": "ticket-1"}]}
        )
        result = await notification_service._send_notification(
            title="Hello",
            body="World",
            recipients=["ExponentPushToken[aaa]"],
            priority="default",
        )

    assert result is False


@pytest.mark.asyncio
async def test_expired_receipt_check_is_deleted(notification_service):
    """Receipt-check messages older than Expo's retention window are expired."""
    msg_id = 46
    enqueued_at = (
        datetime.now(timezone.utc) - timedelta(hours=25)
    ).isoformat()

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "enqueued_at": enqueued_at,
                "message": {
                    "ticket_id": "ticket-old",
                    "token": "ExponentPushToken[old]",
                },
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()

    stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["expired"] == 1
    assert stats["kept"] == 0
    notification_service.queue_service.delete_message.assert_called_once_with(
        queue_name=NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME,
        message_id=msg_id,
    )


@pytest.mark.asyncio
async def test_invalid_receipt_payload_type_is_deleted(notification_service):
    """Non-object receipt payloads are deleted as invalid instead of crashing the batch."""
    msg_id = 47

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "message": "[]",
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()

    stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["failed"] == 1
    notification_service.queue_service.delete_message.assert_called_once_with(
        queue_name=NOTIFICATION_RECEIPT_CHECKS_QUEUE_NAME,
        message_id=msg_id,
    )


@pytest.mark.asyncio
async def test_mark_inactive_failure_keeps_receipt_message(
    notification_service, mock_supabase_client
):
    """If token status update fails, keep the receipt-check message for retry."""
    msg_id = 48
    ticket_id = "ticket-keep-1"
    token = "ExponentPushToken[keep]"

    notification_service.queue_service.read_messages = MagicMock(
        return_value=[
            {
                "msg_id": msg_id,
                "message": {"ticket_id": ticket_id, "token": token},
            }
        ]
    )
    notification_service.queue_service.delete_message = MagicMock()
    mock_supabase_client.table.return_value.update.return_value.in_.return_value.execute.side_effect = (
        Exception("db down")
    )

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client_class.return_value = _mock_httpx_post(
            {
                "data": {
                    ticket_id: {
                        "status": "error",
                        "details": {"error": "DeviceNotRegistered"},
                    }
                }
            }
        )
        stats = await notification_service.process_receipt_checks_queue()

    assert stats["processed"] == 1
    assert stats["kept"] == 1
    assert stats["succeeded"] == 0
    notification_service.queue_service.delete_message.assert_not_called()
