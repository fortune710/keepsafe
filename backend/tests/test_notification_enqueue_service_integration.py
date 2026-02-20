import os
import sys
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch, Mock

# Ensure the backend directory (which contains `services/`) is on sys.path
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.notification_enqueue_service import NotificationEnqueueService
from services.notification_service import NotificationService


@pytest.fixture
def mock_supabase_client():
    """
    Create a MagicMock that simulates a Supabase client for tests.
    
    Returns:
        MagicMock: Mocked Supabase client instance.
    """
    mock_client = MagicMock()
    return mock_client


@pytest.fixture
def mock_redis_client():
    """
    Create a MagicMock that simulates a Redis client for tests.
    
    Returns:
        MagicMock: A mock Redis client instance suitable for stubbing Redis methods.
    """
    mock_client = MagicMock()
    return mock_client


@pytest.fixture
def notification_enqueue_service(monkeypatch, mock_supabase_client, mock_redis_client):
    """
    Create a NotificationEnqueueService configured with mocked Supabase, Redis, cache, and NotificationService for testing.
    
    Parameters:
    	monkeypatch: pytest monkeypatch fixture used to patch module attributes.
    	mock_supabase_client: MagicMock representing the Supabase client to inject.
    	mock_redis_client: MagicMock (or None) representing the Redis client to inject.
    
    Returns:
    	NotificationEnqueueService: An instance of NotificationEnqueueService with its supabase, cache_service, and notification_service wired to the provided mocks.
    """
    from services import notification_enqueue_service as enqueue_module
    from services import redis_client as redis_module
    from services import cache_service as cache_module
    
    # Mock get_supabase_client
    monkeypatch.setattr(
        enqueue_module,
        "get_supabase_client",
        lambda: mock_supabase_client
    )
    
    # Mock get_redis_client
    monkeypatch.setattr(
        redis_module,
        "get_redis_client",
        lambda: mock_redis_client
    )
    
    # Mock get_supabase_client in cache_service
    monkeypatch.setattr(
        cache_module,
        "get_supabase_client",
        lambda: mock_supabase_client
    )
    
    # Mock NotificationService
    mock_notification_service = MagicMock()
    mock_notification_service.enqueue_notification = MagicMock(return_value=True)
    
    with patch("services.notification_enqueue_service.NotificationService") as mock_service_class:
        mock_service_class.return_value = mock_notification_service
        
        with patch("services.cache_service.settings") as mock_settings:
            mock_settings.REDIS_CACHE_TTL = 3600
            
            service = NotificationEnqueueService()
            service.supabase = mock_supabase_client
            service.cache_service.redis_client = mock_redis_client
            service.cache_service.supabase = mock_supabase_client
            service.notification_service = mock_notification_service
            return service


@pytest.mark.asyncio
async def test_enqueue_entry_notification_with_cache_hit(notification_enqueue_service, mock_supabase_client, mock_redis_client):
    """Test enqueueing entry notification with Redis cache hit."""
    # Arrange
    entry = {
        "id": "entry-123",
        "user_id": "owner-123",
        "type": "photo",
        "shared_with": ["user-1", "user-2"],
        "shared_with_everyone": False,
        "is_private": False
    }
    
    # Mock owner profile
    mock_profile_response = MagicMock()
    mock_profile_response.data = {"id": "owner-123", "username": "testuser"}
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_profile_response
    
    # Mock cached notification settings and push tokens (cache hit)
    # Use side_effect to return different values for different calls
    def mget_side_effect(keys):
        """
        Simulates Redis mget responses for notification settings and push tokens based on the requested keys.
        
        Parameters:
            keys (Sequence): Sequence of cache keys passed to mget. If the first key contains "notification_settings", the function returns serialized notification-setting objects; otherwise it returns serialized lists of push tokens.
        
        Returns:
            list[str]: A list of JSON-encoded strings corresponding to the requested keys. When returning notification settings each item is a JSON object like {"user_id": "...", "friend_activity": <bool>}; when returning push tokens each item is a JSON array of token strings.
        """
        if "notification_settings" in str(keys[0]):
            # First call: notification settings
            return [
                json.dumps({"user_id": "user-1", "friend_activity": True}),
                json.dumps({"user_id": "user-2", "friend_activity": True})
            ]
        else:
            # Second call: push tokens
            return [
                json.dumps(["token1", "token2"]),
                json.dumps(["token3"])
            ]
    
    mock_redis_client.mget.side_effect = mget_side_effect
    
    # Act
    result = await notification_enqueue_service.enqueue_entry_notification(entry)
    
    # Assert
    assert result is True
    notification_enqueue_service.notification_service.enqueue_notification.assert_called_once()
    # Verify cache was used (no Supabase calls for settings/tokens)
    # Profile lookup should still happen
    assert mock_supabase_client.table.call_count >= 1


@pytest.mark.asyncio
async def test_enqueue_entry_notification_with_cache_miss(notification_enqueue_service, mock_supabase_client, mock_redis_client):
    """Test enqueueing entry notification with Redis cache miss (fallback to Supabase)."""
    # Arrange
    entry = {
        "id": "entry-123",
        "user_id": "owner-123",
        "type": "photo",
        "shared_with": ["user-1"],
        "shared_with_everyone": False,
        "is_private": False
    }
    
    # Mock owner profile
    mock_profile_response = MagicMock()
    mock_profile_response.data = {"id": "owner-123", "username": "testuser"}
    
    # Mock notification settings (cache miss - fetch from Supabase)
    mock_settings_response = MagicMock()
    mock_settings_response.data = [{"user_id": "user-1", "friend_activity": True}]
    
    # Mock push tokens (cache miss - fetch from Supabase)
    mock_tokens_response = MagicMock()
    mock_tokens_response.data = [{"user_id": "user-1", "token": "token1"}]
    
    # Setup Supabase table mock to return different responses
    def table_side_effect(table_name):
        """
        Return a MagicMock that simulates a Supabase table query response for the given table name.
        
        For table_name "profiles", the mock is configured so that calling
        select().eq().single().execute() returns mock_profile_response.
        For table_name "notification_settings", calling select().in_().execute() returns mock_settings_response.
        For table_name "push_tokens", calling select().in_().execute() returns mock_tokens_response.
        For any other table_name the function returns an unconfigured MagicMock.
        
        Parameters:
            table_name (str): Name of the table to mock.
        
        Returns:
            MagicMock: A MagicMock configured to emulate the expected Supabase query chain for the specified table.
        """
        mock_table = MagicMock()
        if table_name == "profiles":
            mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_profile_response
        elif table_name == "notification_settings":
            mock_table.select.return_value.in_.return_value.execute.return_value = mock_settings_response
        elif table_name == "push_tokens":
            mock_table.select.return_value.in_.return_value.eq.return_value.execute.return_value = mock_tokens_response
        return mock_table
    
    mock_supabase_client.table.side_effect = table_side_effect
    
    # Cache miss for both - use side_effect to handle multiple calls
    def mget_side_effect(keys):
        """
        Simulate a Redis MGET that results in cache misses for every requested key.
        
        Parameters:
            keys (Sequence): An iterable of cache key strings.
        
        Returns:
            list: A list of `None` values whose length matches the number of provided `keys`, representing cache misses.
        """
        return [None] * len(keys)  # All cache misses
    
    mock_redis_client.mget.side_effect = mget_side_effect
    
    # Act
    result = await notification_enqueue_service.enqueue_entry_notification(entry)
    
    # Assert
    assert result is True
    notification_enqueue_service.notification_service.enqueue_notification.assert_called_once()
    # Verify cache was set after fetching from Supabase
    assert mock_redis_client.setex.call_count >= 2  # Settings and tokens cached


@pytest.mark.asyncio
async def test_enqueue_entry_notification_redis_failure(notification_enqueue_service, mock_supabase_client, mock_redis_client):
    """Test enqueueing entry notification when Redis fails (fallback to Supabase)."""
    # Arrange
    entry = {
        "id": "entry-123",
        "user_id": "owner-123",
        "type": "photo",
        "shared_with": ["user-1"],
        "shared_with_everyone": False,
        "is_private": False
    }
    
    # Mock owner profile
    mock_profile_response = MagicMock()
    mock_profile_response.data = {"id": "owner-123", "username": "testuser"}
    
    # Mock Supabase responses
    mock_settings_response = MagicMock()
    mock_settings_response.data = [{"user_id": "user-1", "friend_activity": True}]
    
    mock_tokens_response = MagicMock()
    mock_tokens_response.data = [{"user_id": "user-1", "token": "token1"}]
    
    def table_side_effect(table_name):
        """
        Return a MagicMock that simulates a Supabase table query response for the given table name.
        
        For table_name "profiles", the mock is configured so that calling
        select().eq().single().execute() returns mock_profile_response.
        For table_name "notification_settings", calling select().in_().execute() returns mock_settings_response.
        For table_name "push_tokens", calling select().in_().execute() returns mock_tokens_response.
        For any other table_name the function returns an unconfigured MagicMock.
        
        Parameters:
            table_name (str): Name of the table to mock.
        
        Returns:
            MagicMock: A MagicMock configured to emulate the expected Supabase query chain for the specified table.
        """
        mock_table = MagicMock()
        if table_name == "profiles":
            mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_profile_response
        elif table_name == "notification_settings":
            mock_table.select.return_value.in_.return_value.execute.return_value = mock_settings_response
        elif table_name == "push_tokens":
            mock_table.select.return_value.in_.return_value.eq.return_value.execute.return_value = mock_tokens_response
        return mock_table
    
    mock_supabase_client.table.side_effect = table_side_effect
    
    # Redis throws error
    mock_redis_client.mget.side_effect = Exception("Redis connection error")
    mock_redis_client.setex.side_effect = Exception("Redis set error")
    
    # Act - should not raise exception
    result = await notification_enqueue_service.enqueue_entry_notification(entry)
    
    # Assert
    assert result is True
    notification_enqueue_service.notification_service.enqueue_notification.assert_called_once()
    # Should have fallen back to Supabase


@pytest.mark.asyncio
async def test_enqueue_entry_notification_no_redis(notification_enqueue_service, mock_supabase_client):
    """Test enqueueing entry notification when Redis is not available."""
    # Arrange - disable Redis
    notification_enqueue_service.cache_service.redis_client = None
    
    entry = {
        "id": "entry-123",
        "user_id": "owner-123",
        "type": "photo",
        "shared_with": ["user-1"],
        "shared_with_everyone": False,
        "is_private": False
    }
    
    # Mock owner profile
    mock_profile_response = MagicMock()
    mock_profile_response.data = {"id": "owner-123", "username": "testuser"}
    
    # Mock Supabase responses
    mock_settings_response = MagicMock()
    mock_settings_response.data = [{"user_id": "user-1", "friend_activity": True}]
    
    mock_tokens_response = MagicMock()
    mock_tokens_response.data = [{"user_id": "user-1", "token": "token1"}]
    
    def table_side_effect(table_name):
        """
        Return a MagicMock that simulates a Supabase table query response for the given table name.
        
        For table_name "profiles", the mock is configured so that calling
        select().eq().single().execute() returns mock_profile_response.
        For table_name "notification_settings", calling select().in_().execute() returns mock_settings_response.
        For table_name "push_tokens", calling select().in_().execute() returns mock_tokens_response.
        For any other table_name the function returns an unconfigured MagicMock.
        
        Parameters:
            table_name (str): Name of the table to mock.
        
        Returns:
            MagicMock: A MagicMock configured to emulate the expected Supabase query chain for the specified table.
        """
        mock_table = MagicMock()
        if table_name == "profiles":
            mock_table.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_profile_response
        elif table_name == "notification_settings":
            mock_table.select.return_value.in_.return_value.execute.return_value = mock_settings_response
        elif table_name == "push_tokens":
            mock_table.select.return_value.in_.return_value.eq.return_value.execute.return_value = mock_tokens_response
        return mock_table
    
    mock_supabase_client.table.side_effect = table_side_effect
    
    # Act
    result = await notification_enqueue_service.enqueue_entry_notification(entry)
    
    # Assert
    assert result is True
    notification_enqueue_service.notification_service.enqueue_notification.assert_called_once()
    # Should work with Supabase only


@pytest.mark.asyncio
async def test_filter_recipients_with_cached_settings(notification_enqueue_service, mock_redis_client):
    """Test filtering recipients using cached notification settings."""
    # Arrange
    user_ids = ["user-1", "user-2", "user-3"]
    
    # Mock cached settings
    cached_settings = [
        json.dumps({"user_id": "user-1", "friend_activity": True}),
        json.dumps({"user_id": "user-2", "friend_activity": False}),
        json.dumps({"user_id": "user-3", "friend_activity": True})
    ]
    
    mock_redis_client.mget.return_value = cached_settings
    
    # Act
    result = notification_enqueue_service._filter_recipients_by_notification_settings(
        user_ids,
        notification_type="friend_activity"
    )
    
    # Assert
    assert "user-1" in result
    assert "user-2" not in result  # friend_activity is False
    assert "user-3" in result
    assert len(result) == 2


@pytest.mark.asyncio
async def test_get_push_tokens_batch_with_cache(notification_enqueue_service, mock_redis_client):
    """Test getting push tokens in batch with cache."""
    # Arrange
    user_ids = ["user-1", "user-2"]
    
    # Mock cached tokens
    cached_tokens = [
        json.dumps(["token1", "token2"]),
        json.dumps(["token3"])
    ]
    
    mock_redis_client.mget.return_value = cached_tokens
    
    # Act
    result = notification_enqueue_service._get_push_tokens_for_users(user_ids)
    
    # Assert
    assert len(result) == 3  # token1, token2, token3
    assert "token1" in result
    assert "token2" in result
    assert "token3" in result
