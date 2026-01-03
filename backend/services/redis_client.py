from typing import Optional, Any
import logging
from config import settings

logger = logging.getLogger(__name__)

try:
    import redis
    from redis.connection import ConnectionPool
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis package not installed. Caching will be disabled.")

_redis_client: Optional[Any] = None


def get_redis_client() -> Optional[Any]:
    """
    Get or create Redis client instance.
    Returns None if Redis is not available or connection fails.
    
    Returns:
        Redis client instance or None if connection fails
    """
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if _redis_client is not None:
        return _redis_client
    
    try:
        # Parse Redis URL
        redis_url = settings.REDIS_URL
        
        # Create connection pool for better performance
        connection_pool = ConnectionPool.from_url(
            redis_url,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            decode_responses=True,
            max_connections=50
        )
        
        _redis_client = redis.Redis(connection_pool=connection_pool)
        
        # Test connection
        _redis_client.ping()
        
        logger.info("Redis client initialized successfully")
        return _redis_client
        
    except Exception as e:
        logger.warning(f"Failed to initialize Redis client: {str(e)}. Falling back to Supabase only.")
        _redis_client = None
        return None

