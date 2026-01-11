import os
import sys
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import json

# Ensure the backend directory (which contains `services/`) is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.friend_service import FriendService


@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client that supports schema().rpc() chain."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = None
    
    # Mock the schema().rpc().execute() chain
    mock_schema = MagicMock()
    mock_rpc_result = MagicMock()
    mock_rpc_result.execute.return_value = mock_response
    mock_schema.rpc.return_value = mock_rpc_result
    mock_client.schema.return_value = mock_schema
    
    # Mock table queries
    mock_table = MagicMock()
    mock_table.select.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.execute.return_value = mock_response
    mock_client.table.return_value = mock_table
    
    return mock_client


@pytest.fixture
def friend_service(monkeypatch, mock_supabase_client):
    """Create a FriendService configured for tests with mocked dependencies."""
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
async def test_friend_request_notification_full_flow(friend_service, mock_supabase_client):
    """Test complete flow for friend request notification."""
    # Arrange
    friendship = {
        "id": "friendship-123",
        "user_id": "sender-1",
        "friend_id": "recipient-2",
        "status": "pending"
    }
    
    # Mock sender profile
    sender_profile_response = MagicMock()
    sender_profile_response.data = {
        "id": "sender-1",
        "username": "sender_user",
        "full_name": "Sender Name",
        "email": "sender@example.com"
    }
    
    # Mock table query chain
    mock_table = mock_supabase_client.table.return_value
    mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = sender_profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "recipient-2": {"friend_requests": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "recipient-2": ["ExponentPushToken[token-1]", "ExponentPushToken[token-2]"]
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is True
    friend_service.notification_service.enqueue_notification.assert_called_once()
    
    # Verify notification details
    call_kwargs = friend_service.notification_service.enqueue_notification.call_args[1]
    assert call_kwargs["title"] == "New Friend Request"
    assert "sender_user" in call_kwargs["body"] or "Sender Name" in call_kwargs["body"]
    assert len(call_kwargs["recipients"]) == 2
    assert call_kwargs["metadata"]["friendship_id"] == "friendship-123"
    assert call_kwargs["metadata"]["sender_id"] == "sender-1"
    assert call_kwargs["metadata"]["recipient_id"] == "recipient-2"
    assert call_kwargs["metadata"]["notification_type"] == "friend_request"
    assert call_kwargs["data"]["page_url"] == "/friends"


@pytest.mark.asyncio
async def test_friend_accept_notification_full_flow(friend_service, mock_supabase_client):
    """Test complete flow for friend accept notification."""
    # Arrange
    friendship = {
        "id": "friendship-456",
        "user_id": "requester-1",  # Original requester
        "friend_id": "accepter-2",  # Person who accepted
        "status": "accepted"
    }
    
    # Mock accepter profile
    accepter_profile_response = MagicMock()
    accepter_profile_response.data = {
        "id": "accepter-2",
        "username": "accepter_user",
        "full_name": "Accepter Name",
        "email": "accepter@example.com"
    }
    
    # Mock table query chain
    mock_table = mock_supabase_client.table.return_value
    mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = accepter_profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "requester-1": {"friend_activity": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "requester-1": ["ExponentPushToken[token-3]"]
    }
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is True
    friend_service.notification_service.enqueue_notification.assert_called_once()
    
    # Verify notification details
    call_kwargs = friend_service.notification_service.enqueue_notification.call_args[1]
    assert call_kwargs["title"] == "Friend Request Accepted"
    assert "accepter_user" in call_kwargs["body"] or "Accepter Name" in call_kwargs["body"]
    assert call_kwargs["recipients"] == ["ExponentPushToken[token-3]"]
    assert call_kwargs["metadata"]["friendship_id"] == "friendship-456"
    assert call_kwargs["metadata"]["requester_id"] == "requester-1"
    assert call_kwargs["metadata"]["accepter_id"] == "accepter-2"
    assert call_kwargs["metadata"]["notification_type"] == "friend_accept"
    assert call_kwargs["data"]["page_url"] == "/friends"


@pytest.mark.asyncio
async def test_friend_request_notification_with_fallback_name(friend_service, mock_supabase_client):
    """Test friend request notification uses fallback name when username/full_name missing."""
    # Arrange
    friendship = {
        "id": "friendship-789",
        "user_id": "sender-1",
        "friend_id": "recipient-2",
        "status": "pending"
    }
    
    # Mock sender profile with no username or full_name
    sender_profile_response = MagicMock()
    sender_profile_response.data = {
        "id": "sender-1",
        "email": "sender@example.com"
    }
    
    mock_table = mock_supabase_client.table.return_value
    mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = sender_profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "recipient-2": {"friend_requests": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "recipient-2": ["ExponentPushToken[token-4]"]
    }
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is True
    call_kwargs = friend_service.notification_service.enqueue_notification.call_args[1]
    assert "Someone" in call_kwargs["body"]


@pytest.mark.asyncio
async def test_friend_request_notification_enqueue_failure(friend_service, mock_supabase_client):
    """Test friend request notification when enqueue fails."""
    # Arrange
    friendship = {
        "id": "friendship-999",
        "user_id": "sender-1",
        "friend_id": "recipient-2",
        "status": "pending"
    }
    
    # Mock sender profile
    sender_profile_response = MagicMock()
    sender_profile_response.data = {
        "id": "sender-1",
        "username": "sender_user",
        "full_name": "Sender Name",
        "email": "sender@example.com"
    }
    
    mock_table = mock_supabase_client.table.return_value
    mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = sender_profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "recipient-2": {"friend_requests": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "recipient-2": ["ExponentPushToken[token-5]"]
    }
    
    # Mock notification service to fail
    friend_service.notification_service.enqueue_notification.return_value = False
    
    # Act
    result = await friend_service.send_friend_request_notification(friendship)
    
    # Assert
    assert result is False
    friend_service.notification_service.enqueue_notification.assert_called_once()


@pytest.mark.asyncio
async def test_friend_accept_notification_enqueue_failure(friend_service, mock_supabase_client):
    """Test friend accept notification when enqueue fails."""
    # Arrange
    friendship = {
        "id": "friendship-888",
        "user_id": "requester-1",
        "friend_id": "accepter-2",
        "status": "accepted"
    }
    
    # Mock accepter profile
    accepter_profile_response = MagicMock()
    accepter_profile_response.data = {
        "id": "accepter-2",
        "username": "accepter_user",
        "full_name": "Accepter Name",
        "email": "accepter@example.com"
    }
    
    mock_table = mock_supabase_client.table.return_value
    mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = accepter_profile_response
    
    # Mock cache service
    friend_service.cache_service.get_notification_settings_batch.return_value = {
        "requester-1": {"friend_activity": True}
    }
    friend_service.cache_service.get_push_tokens_batch.return_value = {
        "requester-1": ["ExponentPushToken[token-6]"]
    }
    
    # Mock notification service to fail
    friend_service.notification_service.enqueue_notification.return_value = False
    
    # Act
    result = await friend_service.send_request_accept_notification(friendship)
    
    # Assert
    assert result is False
    friend_service.notification_service.enqueue_notification.assert_called_once()
