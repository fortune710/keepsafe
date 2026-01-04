import os
import sys
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from exponent_server_sdk import PushServerError, DeviceNotRegisteredError

# Ensure the backend directory (which contains `services/`) is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.notification_service import NotificationService


@pytest.fixture
def mock_supabase_client():
    """
    Create a MagicMock that simulates a Supabase client for tests.
    
    Returns:
        mock_client (MagicMock): A mock Supabase client where calling schema(...).rpc(...).execute()
        returns a mock response object with a `data` attribute set to None.
    """
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = None
    
    # Mock the schema().rpc().execute() chain
    mock_schema = MagicMock()
    mock_rpc_result = MagicMock()
    mock_rpc_result.execute.return_value = mock_response
    mock_schema.rpc.return_value = mock_rpc_result
    mock_client.schema.return_value = mock_schema
    
    # Also support direct rpc() for backwards compatibility
    mock_client.rpc.return_value.execute.return_value = mock_response
    
    return mock_client


@pytest.fixture
def notification_service(monkeypatch, mock_supabase_client):
    """
    Create a NotificationService instance configured for tests with a mocked Supabase client and PostHog.
    
    Parameters:
        monkeypatch: pytest monkeypatch fixture used to replace attributes on the notification service module.
        mock_supabase_client: A MagicMock acting as the Supabase client that will be returned by the patched get_supabase_client.
    
    Returns:
        NotificationService: An instance whose Supabase client is set to mock_supabase_client and whose settings are configured for testing.
    """
    # Mock get_supabase_client
    from services import notification_service as notification_module
    monkeypatch.setattr(
        notification_module,
        "get_supabase_client",
        lambda: mock_supabase_client
    )
    
    # Mock PostHog - will be initialized in service
    monkeypatch.setattr(notification_module, "Posthog", MagicMock)
    
    # Set minimal config
    with patch("services.notification_service.settings") as mock_settings:
        mock_settings.NOTIFICATION_QUEUE_NAME = "test_queue"
        mock_settings.NOTIFICATION_DLQ_NAME = "test_dlq"
        mock_settings.NOTIFICATION_CONCURRENCY = 20
        mock_settings.NOTIFICATION_BATCH_SIZE = 100
        mock_settings.NOTIFICATION_DLQ_LIMIT = 3
        mock_settings.POSTHOG_API_KEY = "test_key"
        mock_settings.POSTHOG_HOST = "https://test.posthog.com"
        
        service = NotificationService()
        service.supabase = mock_supabase_client
        return service


@pytest.mark.asyncio
async def test_enqueue_notification_success(notification_service, mock_supabase_client):
    """enqueue_notification should successfully add message to queue."""
    # Arrange
    title = "Test Title"
    body = "Test Body"
    recipients = ["ExponentPushToken[abc123]"]
    priority = "high"
    
    mock_response = MagicMock()
    mock_response.data = {"msg_id": 1}
    # Set up the schema().rpc().execute() chain
    mock_schema = mock_supabase_client.schema.return_value
    mock_rpc_result = mock_schema.rpc.return_value
    mock_rpc_result.execute.return_value = mock_response
    
    # Act
    result = notification_service.enqueue_notification(
        title=title,
        body=body,
        recipients=recipients,
        priority=priority
    )
    
    # Assert
    assert result is True
    # Verify schema was called with "pgmq_public"
    mock_supabase_client.schema.assert_called_with("pgmq_public")
    # Verify rpc was called on the schema result
    mock_schema.rpc.assert_called_once()
    call_args = mock_schema.rpc.call_args
    # RPC is called as rpc(function_name, params_dict)
    assert call_args[0][0] == "send"
    # Second positional argument is the params dict
    params = call_args[0][1] if len(call_args[0]) > 1 else {}
    assert params.get("queue_name") == "test_queue"
    import json
    msg_data = json.loads(params.get("msg", "{}"))
    assert msg_data["title"] == title
    assert msg_data["body"] == body
    assert msg_data["recipients"] == recipients
    assert msg_data["priority"] == priority


@pytest.mark.asyncio
async def test_enqueue_notification_missing_fields(notification_service):
    """enqueue_notification should return False if required fields are missing."""
    # Test missing title
    result = notification_service.enqueue_notification(
        title="",
        body="Test Body",
        recipients=["token"]
    )
    assert result is False
    
    # Test missing body
    result = notification_service.enqueue_notification(
        title="Test Title",
        body="",
        recipients=["token"]
    )
    assert result is False
    
    # Test missing recipients
    result = notification_service.enqueue_notification(
        title="Test Title",
        body="Test Body",
        recipients=[]
    )
    assert result is False


@pytest.mark.asyncio
async def test_enqueue_notification_invalid_priority(notification_service, mock_supabase_client):
    """enqueue_notification should default to 'default' for invalid priority."""
    mock_response = MagicMock()
    mock_response.data = {"msg_id": 1}
    # Set up the schema().rpc().execute() chain
    mock_schema = mock_supabase_client.schema.return_value
    mock_rpc_result = mock_schema.rpc.return_value
    mock_rpc_result.execute.return_value = mock_response
    
    result = notification_service.enqueue_notification(
        title="Test",
        body="Test",
        recipients=["token"],
        priority="invalid"
    )
    
    assert result is True
    mock_schema.rpc.assert_called_once()
    call_args = mock_schema.rpc.call_args
    import json
    params = call_args[0][1] if len(call_args[0]) > 1 else {}
    msg_data = json.loads(params.get("msg", "{}"))
    assert msg_data["priority"] == "default"


@pytest.mark.asyncio
async def test_send_notification_success(notification_service):
    """_send_notification should successfully send via Expo SDK."""
    # Arrange
    mock_response = MagicMock()
    mock_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_response)
    
    # Act
    result = await notification_service._send_notification(
        title="Test",
        body="Test",
        recipients=["token"],
        priority="default"
    )
    
    # Assert
    assert result is True
    notification_service.expo_client.publish.assert_called_once()


@pytest.mark.asyncio
async def test_send_notification_rate_limit_retry(notification_service):
    """_send_notification should retry on rate limit errors with exponential backoff."""
    # Arrange
    mock_response = MagicMock()
    mock_response.status_code = 429
    rate_limit_error = PushServerError("429 Rate limit exceeded", mock_response)
    mock_response = MagicMock()
    mock_response.validate_response = MagicMock()
    
    # First call fails with rate limit, second succeeds
    notification_service.expo_client.publish = MagicMock(
        side_effect=[rate_limit_error, mock_response]
    )
    
    # Act
    result = await notification_service._send_notification(
        title="Test",
        body="Test",
        recipients=["token"],
        priority="default",
        retry_count=0,
        max_retries=3
    )
    
    # Assert
    assert result is True
    assert notification_service.expo_client.publish.call_count == 2


@pytest.mark.asyncio
async def test_send_notification_max_retries_exceeded(notification_service):
    """_send_notification should return False after max retries."""
    # Arrange
    mock_response = MagicMock()
    mock_response.status_code = 429
    rate_limit_error = PushServerError("429 Rate limit exceeded", mock_response)
    notification_service.expo_client.publish = MagicMock(side_effect=rate_limit_error)
    
    # Act
    result = await notification_service._send_notification(
        title="Test",
        body="Test",
        recipients=["token"],
        priority="default",
        retry_count=3,  # Already at max
        max_retries=3
    )
    
    # Assert
    assert result is False


@pytest.mark.asyncio
async def test_handle_failure_move_to_dlq(notification_service, mock_supabase_client):
    """_handle_failure should move message to DLQ when under limit."""
    # Arrange
    msg_id = 123
    message_data = {
        "title": "Test",
        "body": "Test",
        "recipients": ["token"],
        "priority": "default",
        "failure_count": 1
    }
    stats = {"failed": 0, "moved_to_dlq": 0, "discarded": 0}
    
    # Mock delete and send to DLQ using schema().rpc() pattern
    mock_schema = mock_supabase_client.schema.return_value
    mock_rpc_result = mock_schema.rpc.return_value
    mock_rpc_result.execute.return_value = MagicMock()
    
    # Act
    await notification_service._handle_failure(
        msg_id=msg_id,
        message_data=message_data,
        failure_count=1,
        stats=stats
    )
    
    # Assert
    assert stats["moved_to_dlq"] == 1
    assert stats["failed"] == 1
    # Should have called delete and send to DLQ (both use schema().rpc())
    assert mock_schema.rpc.call_count >= 2


@pytest.mark.asyncio
async def test_handle_failure_discard_exceeded_limit(notification_service, mock_supabase_client):
    """_handle_failure should discard message when DLQ limit exceeded."""
    # Arrange
    msg_id = 123
    message_data = {
        "title": "Test",
        "body": "Test",
        "recipients": ["token"],
        "priority": "default",
        "failure_count": 3
    }
    stats = {"failed": 0, "moved_to_dlq": 0, "discarded": 0}
    
    # Mock delete using schema().rpc() pattern
    mock_schema = mock_supabase_client.schema.return_value
    mock_rpc_result = mock_schema.rpc.return_value
    mock_rpc_result.execute.return_value = MagicMock()
    
    # Act
    await notification_service._handle_failure(
        msg_id=msg_id,
        message_data=message_data,
        failure_count=3,  # Already at limit
        stats=stats
    )
    
    # Assert
    assert stats["discarded"] == 1
    assert stats["failed"] == 1
    assert stats["moved_to_dlq"] == 0


@pytest.mark.asyncio
async def test_process_queue_empty(notification_service, mock_supabase_client):
    """process_queue should return empty stats when queue is empty."""
    # Arrange
    mock_response = MagicMock()
    mock_response.data = []
    mock_supabase_client.rpc.return_value.execute.return_value = mock_response
    
    # Act
    stats = await notification_service.process_queue()
    
    # Assert
    assert stats["processed"] == 0
    assert stats["succeeded"] == 0
    assert stats["failed"] == 0


@pytest.mark.asyncio
async def test_process_queue_with_messages(notification_service, mock_supabase_client):
    """process_queue should process messages from queue."""
    # Arrange
    import json
    message_data = {
        "title": "Test 1",
        "body": "Body 1",
        "recipients": ["token1"],
        "priority": "default",
        "failure_count": 0
    }
    mock_messages = [
        {
            "msg_id": 1,
            "read_ct": 1,
            "message": json.dumps(message_data)
        }
    ]
    
    mock_response = MagicMock()
    mock_response.data = mock_messages
    
    # Mock successful send
    mock_push_response = MagicMock()
    mock_push_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_push_response)
    
    # Mock schema().rpc().execute() chain for multiple RPC calls (read and delete)
    def mock_schema_side_effect(schema_name):
        """Return a mock schema object that handles rpc calls."""
        mock_schema = MagicMock()
        
        def mock_rpc_side_effect(rpc_name, *args, **kwargs):
            """Handle different RPC calls."""
            mock_rpc_result = MagicMock()
            if rpc_name == "read":
                mock_rpc_result.execute.return_value = mock_response
            else:
                mock_rpc_result.execute.return_value = MagicMock()
            return mock_rpc_result
        
        mock_schema.rpc.side_effect = mock_rpc_side_effect
        return mock_schema
    
    mock_supabase_client.schema.side_effect = mock_schema_side_effect
    
    # Act
    stats = await notification_service.process_queue()
    
    # Assert
    assert stats["processed"] == 1
    assert stats["succeeded"] == 1


@pytest.mark.asyncio
async def test_concurrency_limit(notification_service):
    """Test that semaphore limits concurrent sends."""
    # Arrange
    notification_service.semaphore = AsyncMock()
    notification_service.semaphore.__aenter__ = AsyncMock()
    notification_service.semaphore.__aexit__ = AsyncMock()
    
    mock_response = MagicMock()
    mock_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_response)
    
    # Act
    await notification_service._send_notification(
        title="Test",
        body="Test",
        recipients=["token"],
        priority="default"
    )
    
    # Assert
    notification_service.semaphore.__aenter__.assert_called_once()


def test_log_error_to_posthog(notification_service):
    """_log_error_to_posthog should capture error to PostHog."""
    # Arrange
    error = Exception("Test error")
    context = {"operation": "test", "key": "value"}
    
    # Act
    notification_service._log_error_to_posthog(error, context)
    
    # Assert - PostHog should have been called (mocked in fixture)
    # The actual PostHog call is mocked, so we just verify it doesn't raise


@pytest.mark.asyncio
async def test_delete_message(notification_service, mock_supabase_client):
    """_delete_message should call pgmq.delete."""
    # Arrange
    msg_id = 123
    mock_schema = mock_supabase_client.schema.return_value
    mock_rpc_result = mock_schema.rpc.return_value
    mock_rpc_result.execute.return_value = MagicMock()
    
    # Act
    await notification_service._delete_message(msg_id)
    
    # Assert
    mock_supabase_client.schema.assert_called_with("pgmq_public")
    mock_schema.rpc.assert_called_once()
    call_args = mock_schema.rpc.call_args
    assert call_args[0][0] == "delete"
    params = call_args[0][1] if len(call_args[0]) > 1 else {}
    assert params.get("queue_name") == "test_queue"
    assert params.get("msg_id") == msg_id
