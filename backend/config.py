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
    @staticmethod
    def get_list_env(value: Optional[str]) -> list[str]:
        """
        Parse a comma-separated string into a clean list of strings.
        Splits by comma, strips whitespace, and filters out empty strings.
        """
        if not value:
            return []
        return [item.strip() for item in value.split(",") if item.strip()]

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
    _DEFAULT_LOG_LEVEL = "DEBUG" if ENVIRONMENT == "development" else "INFO"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", _DEFAULT_LOG_LEVEL).upper()
    if LOG_LEVEL not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG", "NOTSET"}:
        LOG_LEVEL = _DEFAULT_LOG_LEVEL
    
    # PostHog
    POSTHOG_API_KEY: str = os.getenv("POSTHOG_API_KEY", "")
    POSTHOG_HOST: str = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = _get_int_env("REDIS_DB", 0)
    REDIS_CACHE_TTL: int = _get_int_env("REDIS_CACHE_TTL", 3600)

    # Spotify provider
    SPOTIFY_CLIENT_ID: str = os.getenv("SPOTIFY_CLIENT_ID", "")
    SPOTIFY_CLIENT_SECRET: str = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    SPOTIFY_REDIRECT_URI: str = os.getenv("SPOTIFY_REDIRECT_URI", "")
    SPOTIFY_TOKEN_ENCRYPTION_KEY: str = os.getenv("SPOTIFY_TOKEN_ENCRYPTION_KEY", "")


    # SendGrid
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", "contact@fortunealebiosu.dev")
    SENDGRID_FROM_NAME: str = os.getenv("SENDGRID_FROM_NAME", "Fortune from Keepsafe")
    ENTRY_REPORT_NOTIFICATION_TO_EMAIL: str = os.getenv("ENTRY_REPORT_NOTIFICATION_TO_EMAIL", "")
    SUPABASE_WEBHOOK_SECRET: str = os.getenv("SUPABASE_WEBHOOK_SECRET", "")

    # Twilio (SMS OTP)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")

    # Frontend
    ALLOWED_HOSTS: list[str] = get_list_env(os.getenv("ALLOWED_HOSTS", ""))

    def validate_entry_report_email_config(self) -> None:
        """Fail fast when required SendGrid settings for entry report emails are missing."""
        required_fields = {
            "SENDGRID_API_KEY": self.SENDGRID_API_KEY,
            "SENDGRID_FROM_EMAIL": self.SENDGRID_FROM_EMAIL,
            "SENDGRID_FROM_NAME": self.SENDGRID_FROM_NAME,
            "ENTRY_REPORT_NOTIFICATION_TO_EMAIL": self.ENTRY_REPORT_NOTIFICATION_TO_EMAIL,
        }

        missing_fields = [name for name, value in required_fields.items() if not value]
        if missing_fields:
            raise ValueError(
                "Missing required SendGrid entry report configuration: "
                + ", ".join(missing_fields)
            )

settings = Settings()
