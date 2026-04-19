import sys
import os
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import Request, HTTPException

# Add backend directory to sys.path to allow importing utils and services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.rate_limit import rate_limit

@pytest.mark.asyncio
async def test_rate_limit_success():
    # Mock Redis client
    mock_redis = MagicMock()
    mock_redis.pipeline.return_value.execute.return_value = [1, True, 1, True] # [ip_count, expire_ok, user_count, expire_ok]
    
    with patch("utils.rate_limit.get_redis_client", return_value=mock_redis):
        # Mock Request
        mock_request = MagicMock(spec=Request)
        mock_request.client.host = "1.2.3.4"
        mock_request.state.user = {"id": "user123"}
        
        @rate_limit(requests_per_minute=5, context="test")
        async def mock_endpoint(req: Request):
            return {"status": "ok"}
        
        response = await mock_endpoint(mock_request)
        assert response == {"status": "ok"}
        assert mock_redis.pipeline.called

@pytest.mark.asyncio
async def test_rate_limit_exceeded_ip():
    mock_redis = MagicMock()
    # IP count is 6 (limit is 5)
    mock_redis.pipeline.return_value.execute.return_value = [6, True, 1, True]
    
    with patch("utils.rate_limit.get_redis_client", return_value=mock_redis):
        mock_request = MagicMock(spec=Request)
        mock_request.client.host = "1.2.3.4"
        mock_request.state.user = {"id": "user123"}
        
        @rate_limit(requests_per_minute=5, context="test")
        async def mock_endpoint(req: Request):
            return {"status": "ok"}
        
        with pytest.raises(HTTPException) as excinfo:
            await mock_endpoint(mock_request)
        assert excinfo.value.status_code == 429
        assert "Rate limit exceeded" in excinfo.value.detail

@pytest.mark.asyncio
async def test_rate_limit_exceeded_user():
    mock_redis = MagicMock()
    # User count is 6 (limit is 5)
    mock_redis.pipeline.return_value.execute.return_value = [1, True, 6, True]
    
    with patch("utils.rate_limit.get_redis_client", return_value=mock_redis):
        mock_request = MagicMock(spec=Request)
        mock_request.client.host = "1.2.3.4"
        mock_request.state.user = {"id": "user123"}
        
        @rate_limit(requests_per_minute=5, context="test")
        async def mock_endpoint(req: Request):
            return {"status": "ok"}
        
        with pytest.raises(HTTPException) as excinfo:
            await mock_endpoint(mock_request)
        assert excinfo.value.status_code == 429

@pytest.mark.asyncio
async def test_rate_limit_no_request_args():
    # If no request object is passed to the function, it should skip rate limiting
    @rate_limit(requests_per_minute=5, context="test")
    async def mock_endpoint_no_req():
        return {"status": "ok"}
    
    response = await mock_endpoint_no_req()
    assert response == {"status": "ok"}

@pytest.mark.asyncio
async def test_rate_limit_redis_unavailable():
    # If redis is unavailable, it should fail open
    with patch("utils.rate_limit.get_redis_client", return_value=None):
        mock_request = MagicMock(spec=Request)
        
        @rate_limit(requests_per_minute=5, context="test")
        async def mock_endpoint(req: Request):
            return {"status": "ok"}
        
        response = await mock_endpoint(mock_request)
        assert response == {"status": "ok"}
