import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from services.spotify_service import SpotifyService
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/spotify", tags=["spotify"])

def service(supabase=Depends(get_supabase_client)):
    return SpotifyService(supabase)

@router.post("/authorize")
async def authorize(user=Depends(get_current_user), spotify: SpotifyService = Depends(service)):
    return {"authorizationUrl": spotify.create_authorization_url(user.user.id)}

@router.get("/callback")
async def callback(code: str, state: str, spotify: SpotifyService = Depends(service)):
    try:
        await spotify.complete_authorization(code, state)
    except Exception as error:
        logger.exception("Spotify OAuth callback failed")
        raise HTTPException(status_code=400, detail="Spotify authorization failed") from error
    return RedirectResponse("keepsafe://spotify-connected")

@router.post("/sync")
async def sync(user=Depends(get_current_user), spotify: SpotifyService = Depends(service)):
    return {"synced": await spotify.sync_recent_listening(user.user.id)}

@router.get("/listening")
async def listening(limit: int = Query(default=50, ge=1, le=50), user=Depends(get_current_user), spotify: SpotifyService = Depends(service)):
    return spotify.list_recent_listening(user.user.id, limit)

@router.delete("/connection", status_code=204)
async def disconnect(user=Depends(get_current_user), spotify: SpotifyService = Depends(service)):
    spotify.disconnect(user.user.id)
