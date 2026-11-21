import base64
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet

from config import settings
from database.tables import DatabaseTables

logger = logging.getLogger(__name__)
SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com"
SPOTIFY_API_URL = "https://api.spotify.com/v1"


class SpotifyService:
    def __init__(self, supabase):
        self.supabase = supabase

    def _fernet(self):
        if not settings.SPOTIFY_TOKEN_ENCRYPTION_KEY:
            raise ValueError("Spotify token encryption is not configured")
        return Fernet(settings.SPOTIFY_TOKEN_ENCRYPTION_KEY.encode())

    def create_authorization_url(self, user_id: str) -> str:
        if not all([settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_REDIRECT_URI]):
            raise ValueError("Spotify provider is not configured")
        state = secrets.token_urlsafe(32)
        verifier = secrets.token_urlsafe(64)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        self.supabase.table(DatabaseTables.SPOTIFY_OAUTH_STATES.value).insert({
            "state": state, "user_id": user_id, "code_verifier": verifier, "expires_at": expires_at,
        }).execute()
        params = {
            'client_id': settings.SPOTIFY_CLIENT_ID, 'response_type': 'code', 'redirect_uri': settings.SPOTIFY_REDIRECT_URI,
            'scope': 'user-read-recently-played', 'state': state, 'code_challenge_method': 'S256', 'code_challenge': challenge,
        }
        return f"{SPOTIFY_ACCOUNTS_URL}/authorize?{urlencode(params)}"

    async def complete_authorization(self, code: str, state: str) -> str:
        response = self.supabase.table(DatabaseTables.SPOTIFY_OAUTH_STATES.value).select("*").eq("state", state).maybe_single().execute()
        record = response.data
        if not record or datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
            raise ValueError("Spotify authorization has expired")
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                token_response = await client.post(f"{SPOTIFY_ACCOUNTS_URL}/api/token", data={
                    "grant_type": "authorization_code", "code": code, "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
                    "client_id": settings.SPOTIFY_CLIENT_ID, "code_verifier": record["code_verifier"],
                }, auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET))
                token_response.raise_for_status()
                tokens = token_response.json()
            encrypted = self._fernet().encrypt(tokens["refresh_token"].encode()).decode()
            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=int(tokens["expires_in"]))).isoformat()
            self.supabase.table(DatabaseTables.SPOTIFY_CONNECTIONS.value).upsert({
                "user_id": record["user_id"], "refresh_token_encrypted": encrypted, "access_token_expires_at": expires_at,
            }, on_conflict="user_id").execute()
            return record["user_id"]
        finally:
            self.supabase.table(DatabaseTables.SPOTIFY_OAUTH_STATES.value).delete().eq("state", state).execute()

    async def _access_token(self, connection: dict) -> str:
        refresh_token = self._fernet().decrypt(connection["refresh_token_encrypted"].encode()).decode()
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(f"{SPOTIFY_ACCOUNTS_URL}/api/token", data={
                "grant_type": "refresh_token", "refresh_token": refresh_token,
            }, auth=(settings.SPOTIFY_CLIENT_ID, settings.SPOTIFY_CLIENT_SECRET))
            response.raise_for_status()
            return response.json()["access_token"]

    async def sync_recent_listening(self, user_id: str) -> int:
        connection = self.supabase.table(DatabaseTables.SPOTIFY_CONNECTIONS.value).select("*").eq("user_id", user_id).maybe_single().execute().data
        if not connection:
            return 0
        token = await self._access_token(connection)
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{SPOTIFY_API_URL}/me/player/recently-played?limit=50", headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
            plays = response.json().get("items", [])
        events = [{
            "user_id": user_id, "spotify_track_id": play["track"]["id"], "played_at": play["played_at"],
            "title": play["track"]["name"], "artist": ", ".join(artist["name"] for artist in play["track"].get("artists", [])),
            "album": play["track"].get("album", {}).get("name"),
            "artwork_url": next((image["url"] for image in play["track"].get("album", {}).get("images", []) if image.get("url")), None),
        } for play in plays]
        if events:
            self.supabase.table(DatabaseTables.SPOTIFY_LISTENING_EVENTS.value).upsert(events, on_conflict="user_id,spotify_track_id,played_at").execute()
        return len(events)

    def list_recent_listening(self, user_id: str, limit: int):
        return self.supabase.table(DatabaseTables.SPOTIFY_LISTENING_EVENTS.value).select("*").eq("user_id", user_id).order("played_at", desc=True).limit(limit).execute().data or []

    def disconnect(self, user_id: str):
        self.supabase.table(DatabaseTables.SPOTIFY_CONNECTIONS.value).delete().eq("user_id", user_id).execute()
        self.supabase.table(DatabaseTables.SPOTIFY_LISTENING_EVENTS.value).delete().eq("user_id", user_id).execute()
