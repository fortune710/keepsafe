import time
import functools
import logging
from typing import Callable, Optional
from fastapi import Request, HTTPException, status
from services.redis_client import get_redis_client

logger = logging.getLogger(__name__)

def rate_limit(requests_per_minute: int = 60, context: str = "default"):
    """
    Simple rate limiter using Redis.
    Limits by IP address and User ID (if authenticated).
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Find the request object in args or kwargs
            request: Optional[Request] = None
            
            # Check positional args
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            # Check keyword args if not found in positional
            if not request:
                for arg in kwargs.values():
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                # If no request object found, skip rate limiting
                return await func(*args, **kwargs)

            redis = get_redis_client()
            if not redis:
                # If Redis is unavailable, skip rate limiting (fail open)
                return await func(*args, **kwargs)

            # Determine identifiers
            ip = request.client.host if request.client else "unknown"
            user_id = "anonymous"
            
            # Try to get user from state (assigned by auth middleware)
            if hasattr(request.state, "user") and request.state.user:
                # Check if it's a Supabase user object
                user = request.state.user
                if hasattr(user, "user") and hasattr(user.user, "id"):
                    user_id = user.user.id
                elif isinstance(user, dict) and "id" in user:
                    user_id = user["id"]

            now = int(time.time())
            minute = now // 60
            
            # Keys for IP and User
            ip_key = f"rate_limit:{context}:ip:{ip}:{minute}"
            user_key = f"rate_limit:{context}:user:{user_id}:{minute}"

            # Increment and set TTL
            try:
                # We use a pipeline for atomic increment and expire
                pipe = redis.pipeline()
                pipe.incr(ip_key)
                pipe.expire(ip_key, 60)
                pipe.incr(user_key)
                pipe.expire(user_key, 60)
                results = pipe.execute()
                
                ip_count = results[0]
                user_count = results[2]

                if ip_count > requests_per_minute:
                    logger.warning(f"Rate limit exceeded for IP: {ip}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again in a minute."
                    )
                
                if user_id != "anonymous" and user_count > requests_per_minute:
                    logger.warning(f"Rate limit exceeded for User: {user_id}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded. Please try again in a minute."
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error in rate limiter: {str(e)}")
                # Fail open if Redis errors out
                pass

            return await func(*args, **kwargs)
        return wrapper
    return decorator
