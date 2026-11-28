from supabase import create_client, Client
from config import settings

def get_supabase_client() -> Client:
    """Create and return a Supabase client instance."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("Supabase URL and KEY must be set in environment variables")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

