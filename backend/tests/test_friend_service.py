import os
import sys
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

# Ensure the backend directory (which contains `services/`) is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.friend_service import FriendService


@pytest.fixture
def mock_supabase_client():
    """Create a MagicMock that simulates a Supabase client for tests."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = None
    
    # Mock the schema().rpc().execute() chain
    mock_schema = MagicMock()
    mock_rpc_result = MagicMock()
    mock_rpc_result.execute.return_value = mock_response
    mock_schema.rpc.return_value = mock_rpc_result
    mock_client.schema.return_value = mock_schema
    
    # Also support direct table queries
    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.execute.return_value = mock_response
    mock_client.table.return_value = mock_table
    
    return mock_client


@pytest.fixture
def friend_service(monkeypatch, mock_supabase_client):
    """Create a FriendService instance configured for tests."""
    from services import friend_service as friend_module
    monkeypatch.setattr(
        friend_module,
        "get_supabase_client",
        lambda: mock_supabase_client
    )
    
    with patch("services.friend_service.CacheService") as mock_cache_class:
        mock_cache = MagicMock()
        mock_cache.get_notification_settings_batch.return_value = {}
        mock_cache.get_push_tokens_batch.return_value = {}
        mock_cache_class.return_value = mock_cache
        
        with patch("services.friend_service.NotificationService") as mock_notification_class:
            mock_notification = MagicMock()
            mock_notification.enqueue_notification.return_value = True
            mock_notification_class.return_value = mock_notification
            
            service = FriendService()
            service.cache_service = mock_cache
            service.notification_service = mock_notification
            return service


@pytest.mark.asyncio
async def test_send_friend_request_notification_success(friend_service, mock_supabase_client):
    """Test successful friend request notification."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "pending"
    }
    
    # Mock profile lookup
    profile_response = MagicMock()
    profile_response.data = {
        "id": "user-1",
        "username": "testuser",
        "full_name": "Test User",
        "email": "test@example.com"
    }
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "user-2": {"friend_requests": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "user-2": ["ExponentPushToken[token-123]"]
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is True
    friend_service.notification_service.enqueue_notification.assert_called_once()
    call_args = friend_service.notification_service.enqueue_notification.call_args
    assert call_args[1]["title"] == "New Friend Request"
    assert "testuser" in call_args[1]["body"] or "Test User" in call_args[1]["body"]
    assert call_args[1]["recipients"] == ["ExponentPushToken[token-123]"]
    assert call_args[1]["metadata"]["notification_type"] == "friend_request"
    assert call_args[1]["metadata"]["friendship_id"] == "friendship-123"


@pytest.mark.asyncio
async def test_send_friend_request_notification_missing_fields(friend_service):
    """Test friend request notification with missing fields."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        # Missing friend_id
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is False
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_friend_request_notification_not_pending(friend_service):
    """Test friend request notification skipped for non-pending status."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "accepted"
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is True  # Returns True but doesn't send notification
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_friend_request_notification_no_profile(friend_service, mock_supabase_client):
    """Test friend request notification when sender profile not found."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "pending"
    }
    
    # Mock profile lookup returning None
    profile_response = MagicMock()
    profile_response.data = None
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is False
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_friend_request_notification_notifications_disabled(friend_service, mock_supabase_client):
    """Test friend request notification when recipient has notifications disabled."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "pending"
    }
    
    # Mock profile lookup
    profile_response = MagicMock()
    profile_response.data = {
        "id": "user-1",
        "username": "testuser",
        "full_name": "Test User",
        "email": "test@example.com"
    }
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Mock cache service - notifications disabled
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "user-2": {"friend_requests": False}
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is True  # Returns True but doesn't send notification
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_friend_request_notification_no_push_tokens(friend_service, mock_supabase_client):
    """Test friend request notification when recipient has no push tokens."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "pending"
    }
    
    # Mock profile lookup
    profile_response = MagicMock()
    profile_response.data = {
        "id": "user-1",
        "username": "testuser",
        "full_name": "Test User",
        "email": "test@example.com"
    }
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Mock cache service - no push tokens
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "user-2": {"friend_requests": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "user-2": []  # No tokens
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is True  # Returns True but doesn't send notification
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_request_accept_notification_success(friend_service, mock_supabase_client):
    """Test successful friend accept notification."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",  # Original requester
        "friend_id": "user-2",  # Accepter
        "status": "accepted"
    }
    
    # Mock profile lookup for accepter
    profile_response = MagicMock()
    profile_response.data = {
        "id": "user-2",
        "username": "accepter",
        "full_name": "Accepter User",
        "email": "accepter@example.com"
    }
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "user-1": {"friend_activity": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "user-1": ["ExponentPushToken[token-456]"]
    }
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is True
    friend_service.notification_service.enqueue_notification.assert_called_once()
    call_args = friend_service.notification_service.enqueue_notification.call_args
    assert call_args[1]["title"] == "Friend Request Accepted"
    assert "accepter" in call_args[1]["body"] or "Accepter User" in call_args[1]["body"]
    assert call_args[1]["recipients"] == ["ExponentPushToken[token-456]"]
    assert call_args[1]["metadata"]["notification_type"] == "friend_accept"
    assert call_args[1]["metadata"]["friendship_id"] == "friendship-123"


@pytest.mark.asyncio
async def test_send_request_accept_notification_missing_fields(friend_service):
    """Test friend accept notification with missing fields."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        # Missing friend_id
    }
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is False
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_request_accept_notification_not_accepted(friend_service):
    """Test friend accept notification skipped for non-accepted status."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "pending"
    }
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is True  # Returns True but doesn't send notification
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_request_accept_notification_no_profile(friend_service, mock_supabase_client):
    """Test friend accept notification when accepter profile not found."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "accepted"
    }
    
    # Mock profile lookup returning None
    profile_response = MagicMock()
    profile_response.data = None
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is False
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_request_accept_notification_notifications_disabled(friend_service, mock_supabase_client):
    """Test friend accept notification when requester has notifications disabled."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "accepted"
    }
    
    # Mock profile lookup
    profile_response = MagicMock()
    profile_response.data = {
        "id": "user-2",
        "username": "accepter",
        "full_name": "Accepter User",
        "email": "accepter@example.com"
    }
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Mock cache service - notifications disabled
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "user-1": {"friend_activity": False}
    }
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is True  # Returns True but doesn't send notification
    friend_service.notification_service.enqueue_notification.assert_not_called()


@pytest.mark.asyncio
async def test_send_request_accept_notification_no_push_tokens(friend_service, mock_supabase_client):
    """Test friend accept notification when requester has no push tokens."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "user-1",
        "friend_id": "user-2",
        "status": "accepted"
    }
    
    # Mock profile lookup
    profile_response = MagicMock()
    profile_response.data = {
        "id": "user-2",
        "username": "accepter",
        "full_name": "Accepter User",
        "email": "accepter@example.com"
    }
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = profile_response
    
    # Mock cache service - no push tokens
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "user-1": {"friend_activity": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "user-1": []  # No tokens
    }
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is True  # Returns True but doesn't send notification
    friend_service.notification_service.enqueue_notification.assert_not_called()
