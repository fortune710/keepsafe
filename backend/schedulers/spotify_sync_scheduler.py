import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from database.tables import DatabaseTables
from services.spotify_service import SpotifyService
from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class SpotifySyncScheduler:
    """Refreshes connected users' recent Spotify listening history every six hours."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False

    def start(self):
        if self.is_running:
            return
        self.scheduler.add_job(self._sync_all, trigger=IntervalTrigger(hours=6), id="spotify_recent_listening_sync", replace_existing=True)
        self.scheduler.start()
        self.is_running = True

    def stop(self):
        if not self.is_running:
            return
        self.scheduler.shutdown(wait=False)
        self.is_running = False

    async def _sync_all(self):
        supabase = get_supabase_client()
        user_ids = supabase.table(DatabaseTables.SPOTIFY_CONNECTIONS.value).select("user_id").execute().data or []
        service = SpotifyService(supabase)
        results = await asyncio.gather(*(service.sync_recent_listening(row["user_id"]) for row in user_ids), return_exceptions=True)
        failed = sum(isinstance(result, Exception) for result in results)
        logger.info("Spotify scheduled sync completed", extra={"connection_count": len(user_ids), "failure_count": failed})
