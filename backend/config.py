import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def _get_int_env(key: str, default: int) -> int:
    """Safely get integer from environment variable."""
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Google Gemini
    GOOGLE_GENERATIVE_AI_API_KEY: str = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY", "")
    
    # Pinecone
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "keepsafe-entries")
    
    # Server
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # PostHog
    POSTHOG_API_KEY: str = os.getenv("POSTHOG_API_KEY", "")
    POSTHOG_HOST: str = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")
    
    # Notification Service
    NOTIFICATION_QUEUE_NAME: str = os.getenv("NOTIFICATION_QUEUE_NAME", "notifications_q")
    NOTIFICATION_DLQ_NAME: str = os.getenv("NOTIFICATION_DLQ_NAME", "notifications_dlq")
    NOTIFICATION_CONCURRENCY: int = int(os.getenv("NOTIFICATION_CONCURRENCY", "20"))
    NOTIFICATION_BATCH_SIZE: int = int(os.getenv("NOTIFICATION_BATCH_SIZE", "100"))
    NOTIFICATION_DLQ_LIMIT: int = int(os.getenv("NOTIFICATION_DLQ_LIMIT", "3"))
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = _get_int_env("REDIS_DB", 0)
    REDIS_CACHE_TTL: int = _get_int_env("REDIS_CACHE_TTL", 3600)

settings = Settings()

