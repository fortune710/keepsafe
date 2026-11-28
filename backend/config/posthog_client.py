from posthog import Posthog
from config import settings
from typing import Optional

_posthog_client: Optional[Posthog] = None

def get_posthog_client() -> Posthog:
    """Initialize and return Posthog client instance."""
    global _posthog_client
    if _posthog_client is None:
        _posthog_client = Posthog(settings.POSTHOG_API_KEY, host=settings.POSTHOG_HOST)
    return _posthog_client