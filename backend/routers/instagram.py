from fastapi import APIRouter, Depends, HTTPException, Query, Response
from redis.exceptions import RedisError

from controllers.external_connections_controller import ExternalConnectionsController
from services import instagram_service
from services.redis_client import get_redis_client
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user

router = APIRouter(prefix="/instagram", tags=["instagram"])


def _redis():
    client = get_redis_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Connection service unavailable")
    return client


@router.get("/connect")
def connect(response: Response, current_user=Depends(get_current_user)):
    try:
        url = instagram_service.create_authorization_url(_redis(), current_user.user.id)
        response.headers["Cache-Control"] = "no-store"
        return {"authorization_url": url}
    except RedisError:
        raise HTTPException(status_code=503, detail="Connection service unavailable") from None
    except instagram_service.InstagramConfigurationError:
        raise HTTPException(status_code=503, detail="Instagram connection is not configured") from None


@router.get("/callback")
def callback(response: Response, state: str | None = Query(default=None), code: str | None = Query(default=None),
             error: str | None = Query(default=None)):
    if not state or len(state) > 256:
        raise HTTPException(status_code=400, detail="Invalid or expired connection state")
    try:
        user_id = _redis().getdel(instagram_service.STATE_PREFIX + state)
    except RedisError:
        raise HTTPException(status_code=503, detail="Connection service unavailable") from None
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired connection state")
    if error or not code:
        raise HTTPException(status_code=400, detail="Instagram authorization was not completed")
    try:
        instagram_service.token_cipher()
        token = instagram_service.exchange_code(code)
        account_id = instagram_service.get_single_account(token["access_token"])
        connection = instagram_service.make_connection(account_id, token)
        ExternalConnectionsController(get_supabase_client()).save_instagram(user_id, connection)
    except instagram_service.InstagramConfigurationError:
        raise HTTPException(status_code=503, detail="Instagram connection is not configured") from None
    except instagram_service.InstagramAccountError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except instagram_service.InstagramProviderError:
        raise HTTPException(status_code=502, detail="Instagram connection failed") from None
    except Exception:
        raise HTTPException(status_code=503, detail="Connection service unavailable") from None
    response.headers["Cache-Control"] = "no-store"
    return {"status": "connected", "account_id": account_id}
