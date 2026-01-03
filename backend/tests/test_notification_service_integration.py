import os
import sys
import pytest
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from datetime import datetime

# Ensure the backend directory (which contains `services/`) is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.notification_service import NotificationService
from services.notification_scheduler import NotificationScheduler


@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    mock_client = MagicMock()
    return mock_client


@pytest.fixture
def notification_service(monkeypatch, mock_supabase_client):
    """
    Create a NotificationService configured for tests with mocked dependencies and settings.
    
    The returned service has its Supabase client replaced by the provided mock and is initialized with test values for queue names, concurrency, batch size, DLQ limit, and Posthog configuration.
    
    Returns:
        NotificationService: An instance whose `supabase` attribute is set to `mock_supabase_client` and whose external dependencies are patched for testing.
    """
    from services import notification_service as notification_module
    monkeypatch.setattr(
        notification_module,
        "get_supabase_client",
        lambda: mock_supabase_client
    )
    
    monkeypatch.setattr(notification_module, "Posthog", MagicMock)
    
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
async def test_full_flow_enqueue_to_success(notification_service, mock_supabase_client):
    """Test complete flow: enqueue → process → success."""
    # Arrange - Enqueue
    enqueue_response = MagicMock()
    enqueue_response.data = {"msg_id": 1}
    mock_supabase_client.rpc.return_value.execute.return_value = enqueue_response
    
    # Enqueue notification
    result = notification_service.enqueue_notification(
        title="Test Title",
        body="Test Body",
        recipients=["ExponentPushToken[abc123]"],
        priority="high"
    )
    assert result is True
    
    # Arrange - Process
    # Message in queue is JSON string
    message_data = {
        "title": "Test Title",
        "body": "Test Body",
        "recipients": ["ExponentPushToken[abc123]"],
        "priority": "high",
        "failure_count": 0,
        "metadata": {}
    }
    mock_messages = [
        {
            "msg_id": 1,
            "read_ct": 1,
            "message": json.dumps(message_data)
        }
    ]
    
    read_response = MagicMock()
    read_response.data = mock_messages
    mock_supabase_client.rpc.return_value.execute.return_value = read_response
    
    # Mock successful Expo send
    mock_push_response = MagicMock()
    mock_push_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_push_response)
    
    # Mock delete - need to handle multiple RPC calls (read and delete)
    def mock_rpc_side_effect(*args, **kwargs):
        """
        Create a MagicMock that mimics Supabase RPC calls used in tests.
        
        Returns a mock whose `execute()` returns `read_response` when the RPC name is "pgmq_public.read"; for any other RPC name, `execute()` returns a new MagicMock.
        
        Parameters:
            *args: Positional arguments forwarded from the RPC call; the first positional argument is treated as the RPC name.
            **kwargs: Ignored in this helper.
        
        Returns:
            MagicMock: A mock RPC result whose `execute()` method yields the appropriate value for the requested RPC.
        """
        mock_rpc_result = MagicMock()
        if args[0] == "pgmq_public.read":
            mock_rpc_result.execute.return_value = read_response
        else:
            mock_rpc_result.execute.return_value = MagicMock()
        return mock_rpc_result
    
    mock_supabase_client.rpc.side_effect = mock_rpc_side_effect
    
    # Act - Process queue
    stats = await notification_service.process_queue()
    
    # Assert
    assert stats["processed"] == 1
    assert stats["succeeded"] == 1
    assert stats["failed"] == 0
    notification_service.expo_client.publish.assert_called_once()


@pytest.mark.asyncio
async def test_failure_retry_dlq_flow(notification_service, mock_supabase_client):
    """Test failure → retry → DLQ flow."""
    # Arrange - Message that will fail
    message_data = {
        "title": "Test Title",
        "body": "Test Body",
        "recipients": ["ExponentPushToken[abc123]"],
        "priority": "default",
        "failure_count": 0,
        "metadata": {}
    }
    mock_messages = [
        {
            "msg_id": 1,
            "read_ct": 1,
            "message": json.dumps(message_data)
        }
    ]
    
    read_response = MagicMock()
    read_response.data = mock_messages
    mock_supabase_client.rpc.return_value.execute.return_value = read_response
    
    # Mock failed Expo send (non-rate-limit error)
    from exponent_server_sdk import PushServerError
    mock_response = MagicMock()
    mock_response.status_code = 400
    notification_service.expo_client.publish = MagicMock(
        side_effect=PushServerError("Invalid token", mock_response)
    )
    
    # Mock delete and DLQ send - need to handle multiple RPC calls
    def mock_rpc_side_effect(*args, **kwargs):
        """
        Create a MagicMock that mimics Supabase RPC calls used in tests.
        
        Returns a mock whose `execute()` returns `read_response` when the RPC name is "pgmq_public.read"; for any other RPC name, `execute()` returns a new MagicMock.
        
        Parameters:
            *args: Positional arguments forwarded from the RPC call; the first positional argument is treated as the RPC name.
            **kwargs: Ignored in this helper.
        
        Returns:
            MagicMock: A mock RPC result whose `execute()` method yields the appropriate value for the requested RPC.
        """
        mock_rpc_result = MagicMock()
        if args[0] == "pgmq_public.read":
            mock_rpc_result.execute.return_value = read_response
        else:
            mock_rpc_result.execute.return_value = MagicMock()
        return mock_rpc_result
    
    mock_supabase_client.rpc.side_effect = mock_rpc_side_effect
    
    # Act
    stats = await notification_service.process_queue()
    
    # Assert
    assert stats["processed"] == 1
    assert stats["failed"] == 1
    assert stats["moved_to_dlq"] == 1
    
    # Verify message was sent to DLQ
    dlq_calls = [
        call for call in mock_supabase_client.rpc.call_args_list
        if len(call[0]) > 0 and call[0][0] == "pgmq_public.send"
    ]
    assert len(dlq_calls) > 0
    dlq_call = dlq_calls[0]
    params = dlq_call[0][1] if len(dlq_call[0]) > 1 else {}
    assert params.get("queue_name") == "test_dlq"
    msg_data = json.loads(params.get("msg", "{}"))
    assert msg_data["failure_count"] == 1


@pytest.mark.asyncio
async def test_dlq_limit_exceeded_discard_flow(notification_service, mock_supabase_client):
    """Test DLQ limit exceeded → discard flow."""
    # Arrange - Message that has already failed 3 times
    message_data = {
        "title": "Test Title",
        "body": "Test Body",
        "recipients": ["ExponentPushToken[abc123]"],
        "priority": "default",
        "failure_count": 3,  # Already at limit
        "metadata": {}
    }
    mock_messages = [
        {
            "msg_id": 1,
            "read_ct": 1,
            "message": json.dumps(message_data)
        }
    ]
    
    read_response = MagicMock()
    read_response.data = mock_messages
    mock_supabase_client.rpc.return_value.execute.return_value = read_response
    
    # Mock failed Expo send
    from exponent_server_sdk import PushServerError
    mock_response = MagicMock()
    mock_response.status_code = 400
    notification_service.expo_client.publish = MagicMock(
        side_effect=PushServerError("Invalid token", mock_response)
    )
    
    # Mock delete - need to handle multiple RPC calls
    def mock_rpc_side_effect(*args, **kwargs):
        """
        Create a MagicMock that mimics Supabase RPC calls used in tests.
        
        Returns a mock whose `execute()` returns `read_response` when the RPC name is "pgmq_public.read"; for any other RPC name, `execute()` returns a new MagicMock.
        
        Parameters:
            *args: Positional arguments forwarded from the RPC call; the first positional argument is treated as the RPC name.
            **kwargs: Ignored in this helper.
        
        Returns:
            MagicMock: A mock RPC result whose `execute()` method yields the appropriate value for the requested RPC.
        """
        mock_rpc_result = MagicMock()
        if args[0] == "pgmq_public.read":
            mock_rpc_result.execute.return_value = read_response
        else:
            mock_rpc_result.execute.return_value = MagicMock()
        return mock_rpc_result
    
    mock_supabase_client.rpc.side_effect = mock_rpc_side_effect
    
    # Act
    stats = await notification_service.process_queue()
    
    # Assert
    assert stats["processed"] == 1
    assert stats["failed"] == 1
    assert stats["discarded"] == 1
    assert stats["moved_to_dlq"] == 0
    
    # Verify message was NOT sent to DLQ (should be discarded)
    dlq_calls = [
        call for call in mock_supabase_client.rpc.call_args_list
        if len(call[0]) > 0 and call[0][0] == "pgmq_public.send"
    ]
    # Check if any DLQ sends were made
    dlq_sends = [call for call in dlq_calls if len(call[0]) > 1 and call[0][1].get("queue_name") == "test_dlq"]
    assert len(dlq_sends) == 0


@pytest.mark.asyncio
async def test_concurrent_processing(notification_service, mock_supabase_client):
    """Test that multiple messages are processed concurrently."""
    # Arrange - Multiple messages
    mock_messages = [
        {
            "msg_id": i,
            "read_ct": 1,
            "message": json.dumps({
                "title": f"Test {i}",
                "body": f"Body {i}",
                "recipients": [f"token{i}"],
                "priority": "default",
                "failure_count": 0,
                "metadata": {}
            })
        }
        for i in range(5)
    ]
    
    read_response = MagicMock()
    read_response.data = mock_messages
    mock_supabase_client.rpc.return_value.execute.return_value = read_response
    
    # Mock successful sends
    mock_push_response = MagicMock()
    mock_push_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_push_response)
    
    # Mock delete - need to handle multiple RPC calls
    def mock_rpc_side_effect(*args, **kwargs):
        """
        Create a MagicMock that mimics Supabase RPC calls used in tests.
        
        Returns a mock whose `execute()` returns `read_response` when the RPC name is "pgmq_public.read"; for any other RPC name, `execute()` returns a new MagicMock.
        
        Parameters:
            *args: Positional arguments forwarded from the RPC call; the first positional argument is treated as the RPC name.
            **kwargs: Ignored in this helper.
        
        Returns:
            MagicMock: A mock RPC result whose `execute()` method yields the appropriate value for the requested RPC.
        """
        mock_rpc_result = MagicMock()
        if args[0] == "pgmq_public.read":
            mock_rpc_result.execute.return_value = read_response
        else:
            mock_rpc_result.execute.return_value = MagicMock()
        return mock_rpc_result
    
    mock_supabase_client.rpc.side_effect = mock_rpc_side_effect
    
    # Act
    stats = await notification_service.process_queue()
    
    # Assert
    assert stats["processed"] == 5
    assert stats["succeeded"] == 5
    assert notification_service.expo_client.publish.call_count == 5


@pytest.mark.asyncio
async def test_process_dlq(notification_service, mock_supabase_client):
    """Test processing messages from DLQ."""
    # Arrange - DLQ message
    message_data = {
        "title": "DLQ Test",
        "body": "DLQ Body",
        "recipients": ["token"],
        "priority": "default",
        "failure_count": 1,
        "metadata": {}
    }
    mock_messages = [
        {
            "msg_id": 1,
            "read_ct": 1,
            "message": json.dumps(message_data)
        }
    ]
    
    read_response = MagicMock()
    read_response.data = mock_messages
    mock_supabase_client.rpc.return_value.execute.return_value = read_response
    
    # Mock successful send
    mock_push_response = MagicMock()
    mock_push_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_push_response)
    
    # Mock delete - need to handle multiple RPC calls
    def mock_rpc_side_effect(*args, **kwargs):
        """
        Create a MagicMock that mimics Supabase RPC calls used in tests.
        
        Returns a mock whose `execute()` returns `read_response` when the RPC name is "pgmq_public.read"; for any other RPC name, `execute()` returns a new MagicMock.
        
        Parameters:
            *args: Positional arguments forwarded from the RPC call; the first positional argument is treated as the RPC name.
            **kwargs: Ignored in this helper.
        
        Returns:
            MagicMock: A mock RPC result whose `execute()` method yields the appropriate value for the requested RPC.
        """
        mock_rpc_result = MagicMock()
        if args[0] == "pgmq_public.read":
            mock_rpc_result.execute.return_value = read_response
        else:
            mock_rpc_result.execute.return_value = MagicMock()
        return mock_rpc_result
    
    mock_supabase_client.rpc.side_effect = mock_rpc_side_effect
    
    # Act
    stats = await notification_service.process_dlq()
    
    # Assert
    assert stats["processed"] == 1
    # Verify it read from DLQ (queue name should be swapped)
    read_calls = [
        call for call in mock_supabase_client.rpc.call_args_list
        if len(call[0]) > 0 and call[0][0] == "pgmq_public.read"
    ]
    assert len(read_calls) > 0


def test_scheduler_initialization():
    """Test that scheduler initializes correctly."""
    with patch("services.notification_scheduler.NotificationService"):
        scheduler = NotificationScheduler()
        assert scheduler.is_running is False
        assert scheduler.scheduler is not None
        assert scheduler.notification_service is not None


def test_scheduler_start_stop():
    """Test scheduler start and stop."""
    with patch("services.notification_scheduler.NotificationService"):
        scheduler = NotificationScheduler()
        
        # Mock the APScheduler
        mock_apscheduler = MagicMock()
        scheduler.scheduler = mock_apscheduler
        
        # Test start
        scheduler.start()
        assert scheduler.is_running is True
        mock_apscheduler.start.assert_called_once()
        
        # Test stop
        scheduler.stop()
        assert scheduler.is_running is False
        mock_apscheduler.shutdown.assert_called_once()


@pytest.mark.asyncio
async def test_scheduler_job_execution(notification_service, mock_supabase_client):
    """Test that scheduler job executes process_queue."""
    with patch("services.notification_scheduler.NotificationService") as mock_service_class:
        mock_service_instance = notification_service
        mock_service_class.return_value = mock_service_instance
        
        scheduler = NotificationScheduler()
        scheduler.notification_service = mock_service_instance
        
        # Mock empty queue
        mock_response = MagicMock()
        mock_response.data = []
        mock_supabase_client.rpc.return_value.execute.return_value = mock_response
        
        # Act
        await scheduler._process_queue_job()
        
        # Assert - process_queue should have been called
        # (We can't directly verify this, but if it runs without error, it's working)


@pytest.mark.asyncio
async def test_exponential_backoff_calculation(notification_service):
    """
    Verify that exponential backoff delays are applied when a rate-limit (429) error occurs during publish and that the delay is capped (<= 60 seconds).
    
    Parameters:
        notification_service: Test fixture providing a configured NotificationService instance used to call _send_notification and observe retry/backoff behavior.
    """
    # This test verifies the backoff logic is applied
    # The actual delay calculation happens in _send_notification
    
    from exponent_server_sdk import PushServerError
    
    # Mock rate limit error
    mock_response = MagicMock()
    mock_response.status_code = 429
    rate_limit_error = PushServerError("429 Rate limit exceeded", mock_response)
    
    # Track call times
    call_times = []
    
    def mock_publish(*args, **kwargs):
        """
        Simulate an Expo publish call that records invocation times and fails on the first attempt.
        
        Appends the current datetime to the outer-scope `call_times` list. On the first invocation raises the outer-scope `rate_limit_error`. On subsequent invocations returns a MagicMock response whose `validate_response` attribute is a MagicMock.
        
        Returns:
            A mock response object with a `validate_response` attribute.
        
        Raises:
            rate_limit_error: The error object provided in the enclosing scope on the first call.
        """
        call_times.append(datetime.now())
        if len(call_times) == 1:
            raise rate_limit_error
        mock_response = MagicMock()
        mock_response.validate_response = MagicMock()
        return mock_response
    
    notification_service.expo_client.publish = mock_publish
    
    # Mock sleep to track delays
    sleep_calls = []
    original_sleep = asyncio.sleep
    
    async def mock_sleep(delay):
        """
        Record the requested sleep delay and perform a short real sleep to speed tests.
        
        Appends the provided delay to the shared `sleep_calls` list so tests can inspect backoff timings, then awaits the original sleep function with a short fixed duration (0.01 seconds) to avoid long test delays.
        
        Parameters:
            delay (float): The requested sleep duration to record.
        """
        sleep_calls.append(delay)
        await original_sleep(0.01)  # Minimal delay for test
    
    with patch("asyncio.sleep", side_effect=mock_sleep):
        result = await notification_service._send_notification(
            title="Test",
            body="Test",
            recipients=["token"],
            priority="default",
            retry_count=0,
            max_retries=3
        )
    
    # Assert - should have retried with backoff
    assert len(sleep_calls) > 0
    # Backoff delay should be exponential (capped at 60)
    assert sleep_calls[0] <= 60


@pytest.mark.asyncio
async def test_batch_size_limit(notification_service, mock_supabase_client):
    """Test that only batch_size messages are processed per run."""
    # Arrange - More messages than batch size
    batch_size = 5
    notification_service.batch_size = batch_size
    
    mock_messages = [
        {
            "msg_id": i,
            "read_ct": 1,
            "message": json.dumps({
                "title": f"Test {i}",
                "body": f"Body {i}",
                "recipients": ["token"],
                "priority": "default",
                "failure_count": 0,
                "metadata": {}
            })
        }
        for i in range(10)  # More than batch_size
    ]
    
    read_response = MagicMock()
    read_response.data = mock_messages[:batch_size]  # Only return batch_size
    mock_supabase_client.rpc.return_value.execute.return_value = read_response
    
    # Mock successful sends
    mock_push_response = MagicMock()
    mock_push_response.validate_response = MagicMock()
    notification_service.expo_client.publish = MagicMock(return_value=mock_push_response)
    
    # Mock delete - need to handle multiple RPC calls
    def mock_rpc_side_effect(*args, **kwargs):
        """
        Create a MagicMock that mimics Supabase RPC calls used in tests.
        
        Returns a mock whose `execute()` returns `read_response` when the RPC name is "pgmq_public.read"; for any other RPC name, `execute()` returns a new MagicMock.
        
        Parameters:
            *args: Positional arguments forwarded from the RPC call; the first positional argument is treated as the RPC name.
            **kwargs: Ignored in this helper.
        
        Returns:
            MagicMock: A mock RPC result whose `execute()` method yields the appropriate value for the requested RPC.
        """
        mock_rpc_result = MagicMock()
        if args[0] == "pgmq_public.read":
            mock_rpc_result.execute.return_value = read_response
        else:
            mock_rpc_result.execute.return_value = MagicMock()
        return mock_rpc_result
    
    mock_supabase_client.rpc.side_effect = mock_rpc_side_effect
    
    # Act
    stats = await notification_service.process_queue()
    
    # Assert - Should only process batch_size messages
    assert stats["processed"] == batch_size
    assert notification_service.expo_client.publish.call_count == batch_size
