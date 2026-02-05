import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def _get_int_env(key: str, default: int) -> int:
    """
    Retrieve an integer value from an environment variable with a fallback.
    
    If the environment variable named by `key` is not set or cannot be converted to an integer,
    the provided `default` is returned.
    
    Parameters:
        key (str): Name of the environment variable to read.
        default (int): Value to return if the environment variable is missing or invalid.
    
    Returns:
        int: The parsed integer from the environment variable, or `default` if unset or not parseable.
    """
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
    NOTIFICATION_CONCURRENCY: int = _get_int_env("NOTIFICATION_CONCURRENCY", 20)
    NOTIFICATION_BATCH_SIZE: int = _get_int_env("NOTIFICATION_BATCH_SIZE", 100)
    NOTIFICATION_DLQ_LIMIT: int = int(os.getenv("NOTIFICATION_DLQ_LIMIT", "3"))
    NOTIFICATION_INTERVAL_MINUTES: int = _get_int_env("NOTIFICATION_INTERVAL_MINUTES", 5)
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = _get_int_env("REDIS_DB", 0)
    REDIS_CACHE_TTL: int = _get_int_env("REDIS_CACHE_TTL", 3600)

    # Twilio (SMS OTP)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")

settings = Settings()
