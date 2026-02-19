from typing import Dict, Any, List, Optional
import json
import logging
from services.redis_client import get_redis_client
from services.supabase_client import get_supabase_client
from config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Service for caching notification settings and push tokens with lazy loading."""
    
    def __init__(self):
        """
        Initialize the CacheService and configure its backend clients and TTL.
        
        Sets the following attributes:
        - redis_client: Redis client instance or None when Redis is unavailable.
        - supabase: Supabase client used as the primary data source/fallback.
        - cache_ttl: Time-to-live for cached entries in seconds (from settings).
        
        Logs whether Redis was found or if the service will operate with Supabase only.
        """
        self.redis_client = get_redis_client()
        self.supabase = get_supabase_client()
        self.cache_ttl = settings.REDIS_CACHE_TTL
        
        if self.redis_client:
            logger.info(f"CacheService initialized with Redis (TTL: {self.cache_ttl}s)")
        else:
            logger.info("CacheService initialized without Redis (Supabase only)")
    
    def _get_environment(self) -> str:
        """
        Get the push token environment based on settings.ENVIRONMENT.
        Maps 'development' to 'dev', 'production' to 'prod', and falls back to 'prod' for any other value.
        
        Returns:
            str: 'dev' or 'prod'
        """
        env = settings.ENVIRONMENT.lower()
        if env == 'development':
            return 'dev'
        elif env == 'production':
            return 'prod'
        else:
            # Fallback to 'prod' if environment is not recognized
            logger.warning(f"Unknown environment '{settings.ENVIRONMENT}', defaulting to 'prod'")
            return 'prod'
    
    def get_notification_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user's notification settings, using the Redis cache when available and falling back to Supabase on a cache miss.
        
        Parameters:
            user_id (str): ID of the user whose notification settings to retrieve.
        
        Returns:
            dict: Notification settings for the user (keys include `user_id`, `friend_requests`, `push_notifications`, `entry_reminder`, `friend_activity`), or `None` if no settings are found or an error occurs.
        """
        cache_key = f"notification_settings:{user_id}"
        
        # Try Redis cache first
        cached_data = self._get_from_redis(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache hit for notification settings: {user_id}")
            return cached_data
        
        # Cache miss - fetch from Supabase
        logger.debug(f"Cache miss for notification settings: {user_id}")
        try:
            response = self.supabase.table("notification_settings").select(
                "user_id, friend_requests, push_notifications, entry_reminder, friend_activity"
            ).eq("user_id", user_id).single().execute()
            
            settings_data = response.data if response.data else None
            
            # Cache the result if found
            if settings_data:
                self._set_in_redis(cache_key, settings_data, self.cache_ttl)
            
            return settings_data
            
        except Exception as e:
            logger.error(f"Error fetching notification settings from Supabase for user {user_id}: {str(e)}")
            return None
    
    def get_notification_settings_batch(
        self,
        user_ids: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Retrieve notification settings for multiple users using Redis batch cache with Supabase fallback.
        
        Parameters:
            user_ids (List[str]): List of user IDs to fetch settings for.
        
        Returns:
            Dict[str, Dict[str, Any]]: Mapping from user_id to its settings dictionary for users found; user IDs with no stored settings are omitted.
        """
        if not user_ids:
            return {}
        
        result: Dict[str, Dict[str, Any]] = {}
        cache_keys = [f"notification_settings:{user_id}" for user_id in user_ids]
        uncached_user_ids: List[str] = []
        
        # Try batch get from Redis
        if self.redis_client:
            try:
                cached_values = self.redis_client.mget(cache_keys)
                for i, cached_value in enumerate(cached_values):
                    if cached_value is not None:
                        try:
                            result[user_ids[i]] = json.loads(cached_value)
                            logger.debug(f"Cache hit for notification settings: {user_ids[i]}")
                        except (json.JSONDecodeError, TypeError) as e:
                            logger.warning(f"Error parsing cached settings for {user_ids[i]}: {str(e)}")
                            uncached_user_ids.append(user_ids[i])
                    else:
                        uncached_user_ids.append(user_ids[i])
            except Exception as e:
                logger.warning(f"Error batch getting from Redis: {str(e)}. Falling back to Supabase.")
                uncached_user_ids = user_ids
        else:
            uncached_user_ids = user_ids
        
        # Fetch uncached items from Supabase
        if uncached_user_ids:
            try:
                response = self.supabase.table("notification_settings").select(
                    "user_id, friend_requests, push_notifications, entry_reminder, friend_activity"
                ).in_("user_id", uncached_user_ids).execute()
                
                settings_list = response.data if response.data else []
                
                # Cache and add to result
                for setting in settings_list:
                    user_id = setting["user_id"]
                    result[user_id] = setting
                    cache_key = f"notification_settings:{user_id}"
                    self._set_in_redis(cache_key, setting, self.cache_ttl)
                    logger.debug(f"Cached notification settings: {user_id}")
                
            except Exception as e:
                logger.error(f"Error batch fetching notification settings from Supabase: {str(e)}")
        
        return result
    
    def get_push_tokens(self, user_id: str) -> List[str]:
        """
        Get push tokens for a user with lazy loading.
        
        Args:
            user_id: User ID to get tokens for
        
        Returns:
            List of Expo push tokens
        """
        cache_key = f"push_tokens:{user_id}"
        
        # Try Redis cache first
        cached_data = self._get_from_redis(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache hit for push tokens: {user_id}")
            return cached_data if isinstance(cached_data, list) else []
        
        # Cache miss - fetch from Supabase
        logger.debug(f"Cache miss for push tokens: {user_id}")
        try:
            environment = self._get_environment()
            response = self.supabase.table("push_tokens").select("token").eq("user_id", user_id).eq("environment", environment).execute()
            
            tokens = response.data if response.data else []
            token_list = [token["token"] for token in tokens if token.get("token")]
            
            # Cache the result
            if token_list:
                self._set_in_redis(cache_key, token_list, self.cache_ttl)
            else:
                # Cache empty list to avoid repeated queries
                self._set_in_redis(cache_key, [], self.cache_ttl)
            
            return token_list
            
        except Exception as e:
            logger.error(f"Error fetching push tokens from Supabase for user {user_id}: {str(e)}")
            return []
    
    def get_push_tokens_batch(self, user_ids: List[str]) -> Dict[str, List[str]]:
        """
        Retrieve Expo push tokens for multiple users, using cached values when available and falling back to Supabase for misses.
        
        Parameters:
            user_ids (List[str]): User IDs to retrieve tokens for.
        
        Returns:
            Dict[str, List[str]]: Mapping from each requested `user_id` to a list of push tokens; users with no tokens are mapped to an empty list.
        """
        if not user_ids:
            return {}
        
        result: Dict[str, List[str]] = {}
        cache_keys = [f"push_tokens:{user_id}" for user_id in user_ids]
        uncached_user_ids: List[str] = []
        
        # Try batch get from Redis
        if self.redis_client:
            try:
                cached_values = self.redis_client.mget(cache_keys)
                for i, cached_value in enumerate(cached_values):
                    if cached_value is not None:
                        try:
                            tokens = json.loads(cached_value)
                            result[user_ids[i]] = tokens if isinstance(tokens, list) else []
                            logger.debug(f"Cache hit for push tokens: {user_ids[i]}")
                        except (json.JSONDecodeError, TypeError) as e:
                            logger.warning(f"Error parsing cached tokens for {user_ids[i]}: {str(e)}")
                            uncached_user_ids.append(user_ids[i])
                    else:
                        uncached_user_ids.append(user_ids[i])
            except Exception as e:
                logger.warning(f"Error batch getting from Redis: {str(e)}. Falling back to Supabase.")
                uncached_user_ids = user_ids
        else:
            uncached_user_ids = user_ids
        
        # Fetch uncached items from Supabase
        if uncached_user_ids:
            try:
                environment = self._get_environment()
                response = self.supabase.table("push_tokens").select("user_id, token").in_("user_id", uncached_user_ids).eq("environment", environment).execute()
                
                tokens_list = response.data if response.data else []
                
                # Group tokens by user_id
                tokens_by_user: Dict[str, List[str]] = {}
                for token_data in tokens_list:
                    user_id = token_data.get("user_id")
                    token = token_data.get("token")
                    if user_id and token:
                        if user_id not in tokens_by_user:
                            tokens_by_user[user_id] = []
                        tokens_by_user[user_id].append(token)
                
                # Cache and add to result
                for user_id in uncached_user_ids:
                    token_list = tokens_by_user.get(user_id, [])
                    result[user_id] = token_list
                    cache_key = f"push_tokens:{user_id}"
                    self._set_in_redis(cache_key, token_list, self.cache_ttl)
                    logger.debug(f"Cached push tokens: {user_id}")
                
            except Exception as e:
                logger.error(f"Error batch fetching push tokens from Supabase: {str(e)}")
        
        return result
    
    def _get_from_redis(self, key: str) -> Optional[Any]:
        """
        Retrieve a value from the Redis cache by key, decoding JSON strings when present.
        
        Parameters:
            key (str): Cache key to look up.
        
        Returns:
            The cached value: parsed JSON for JSON-encoded strings, the raw string for non-JSON strings, the stored object for non-string values, or `None` if Redis is unavailable, the key is missing, or an error occurs.
        """
        if not self.redis_client:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            
            # Parse JSON if it's a string
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    # If not JSON, return as string
                    return value
            
            return value
            
        except Exception as e:
            logger.warning(f"Error getting from Redis cache (key: {key}): {str(e)}")
            return None
    
    def _set_in_redis(self, key: str, value: Any, ttl: int) -> bool:
        """
        Store a value in Redis under the given key with the specified TTL.
        
        If `value` is a dict or list it will be serialized to JSON before storing. If no Redis client is available or an error occurs, the operation is a no-op and returns `False`.
        
        Parameters:
            key (str): Cache key under which to store the value.
            value (Any): Value to store; dicts and lists are serialized to JSON.
            ttl (int): Time-to-live in seconds for the cached entry.
        
        Returns:
            bool: `True` if the value was successfully written to Redis, `False` otherwise.
        """
        if not self.redis_client:
            return False
        
        try:
            # Serialize to JSON if it's a complex type
            if isinstance(value, (dict, list)):
                serialized_value = json.dumps(value)
            else:
                serialized_value = value
            
            self.redis_client.setex(key, ttl, serialized_value)
            return True
            
        except Exception as e:
            logger.warning(f"Error setting in Redis cache (key: {key}): {str(e)}")
            return False
