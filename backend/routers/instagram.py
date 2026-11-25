import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.routing import APIRoute
from fastapi.exceptions import RequestValidationError
from redis.exceptions import RedisError

from controllers.external_connections_controller import ExternalConnectionsController
from config import settings
from services import instagram_service
from services.redis_client import get_redis_client
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user

logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, settings.LOG_LEVEL, logging.INFO))


class InstagramLoggingRoute(APIRoute):
    """Log endpoint outcomes, including failures during authentication."""

    def get_route_handler(self):
        route_handler = super().get_route_handler()
        operation = self.name

        async def logged_handler(request: Request):
            started = time.monotonic()
            request_id = str(uuid.uuid4())
            status_code = 500
            reason = "unexpected_error"
            try:
                response = await route_handler(request)
                status_code = response.status_code
                reason = getattr(request.state, "instagram_reason", "success")
                return response
            except HTTPException as exc:
                status_code = exc.status_code
                default_reason = "authentication_failed" if status_code in (401, 403) else "request_failed"
                reason = getattr(request.state, "instagram_reason", default_reason)
                raise
            except RequestValidationError:
                status_code = 422
                reason = "invalid_request"
                raise
            finally:
                level = logging.INFO if status_code < 400 else logging.WARNING if status_code < 500 else logging.ERROR
                messages = {
                    "success": "Instagram connection request completed successfully",
                    "authentication_failed": "Supabase authentication failed or credentials were missing",
                    "request_failed": "Instagram connection request was rejected",
                    "invalid_request": "Instagram connection request parameters are invalid",
                    "unexpected_error": "An unexpected error occurred while processing the Instagram request",
                }
                diagnostic_message = getattr(request.state, "instagram_message", messages.get(reason, "Instagram connection request failed"))
                context = {
                    "event": "instagram_oauth_request",
                    "operation": operation,
                    "http_status_code": status_code,
                    "outcome": reason,
                    "request_id": request_id,
                    "duration_ms": round((time.monotonic() - started) * 1000),
                    "diagnostic_message": diagnostic_message,
                }
                context.update(getattr(request.state, "instagram_error_details", {}))
                logger.log(level, "Instagram connection request completed", extra=context)

        return logged_handler


router = APIRouter(prefix="/instagram", tags=["instagram"], route_class=InstagramLoggingRoute)


def _redis(request: Request):
    client = get_redis_client()
    if client is None:
        request.state.instagram_reason = "redis_unavailable"
        request.state.instagram_message = "Redis could not be initialized or reached"
        raise HTTPException(status_code=503, detail="Connection service unavailable")
    return client


@router.get("/connect")
def connect(request: Request, response: Response, current_user=Depends(get_current_user)):
    try:
        url = instagram_service.create_authorization_url(_redis(request), current_user.user.id)
        response.headers["Cache-Control"] = "no-store"
        return {"authorization_url": url}
    except RedisError:
        request.state.instagram_reason = "redis_unavailable"
        request.state.instagram_message = "Redis failed while saving OAuth state"
        raise HTTPException(status_code=503, detail="Connection service unavailable") from None
    except instagram_service.InstagramConfigurationError as exc:
        request.state.instagram_reason = "configuration_error"
        request.state.instagram_message = str(exc)
        raise HTTPException(status_code=503, detail="Instagram connection is not configured") from None


@router.get("/callback")
def callback(request: Request, response: Response, state: str | None = Query(default=None), code: str | None = Query(default=None),
             error: str | None = Query(default=None)):
    if not state or len(state) > 256:
        request.state.instagram_reason = "invalid_state"
        request.state.instagram_message = "OAuth state is missing or too long"
        raise HTTPException(status_code=400, detail="Invalid or expired connection state")
    try:
        user_id = _redis(request).getdel(instagram_service.STATE_PREFIX + state)
    except RedisError:
        request.state.instagram_reason = "redis_unavailable"
        request.state.instagram_message = "Redis failed while consuming OAuth state"
        raise HTTPException(status_code=503, detail="Connection service unavailable") from None
    if not user_id:
        request.state.instagram_reason = "invalid_state"
        request.state.instagram_message = "OAuth state is unknown, expired, or already used"
        raise HTTPException(status_code=400, detail="Invalid or expired connection state")
    if error or not code:
        request.state.instagram_reason = "authorization_incomplete"
        request.state.instagram_message = "Meta authorization was denied or the authorization code is missing"
        raise HTTPException(status_code=400, detail="Instagram authorization was not completed")
    try:
        request.state.instagram_stage = "encryption setup"
        instagram_service.token_cipher()
        request.state.instagram_stage = "token exchange"
        token = instagram_service.exchange_code(code)
        request.state.instagram_stage = "account discovery"
        account_id = instagram_service.get_single_account(token["access_token"])
        request.state.instagram_stage = "token encryption"
        connection = instagram_service.make_connection(account_id, token)
        request.state.instagram_stage = "connection persistence"
        ExternalConnectionsController(get_supabase_client()).save_instagram(user_id, connection)
    except instagram_service.InstagramConfigurationError as exc:
        request.state.instagram_reason = "configuration_error"
        request.state.instagram_message = str(exc)
        raise HTTPException(status_code=503, detail="Instagram connection is not configured") from None
    except instagram_service.InstagramAccountError as exc:
        request.state.instagram_reason = "account_selection_error"
        request.state.instagram_message = str(exc)
        raise HTTPException(status_code=400, detail=str(exc)) from None
    except instagram_service.InstagramProviderError as exc:
        request.state.instagram_reason = "provider_error"
        request.state.instagram_message = f"{exc} during {request.state.instagram_stage}"
        request.state.instagram_error_details = {
            key: value for key, value in {
                "meta_error_code": exc.code,
                "meta_error_subcode": exc.subcode,
                "meta_http_status": exc.http_status,
            }.items() if value is not None
        }
        raise HTTPException(status_code=502, detail="Instagram connection failed") from None
    except Exception as exc:
        request.state.instagram_reason = "connection_storage_error"
        request.state.instagram_message = f"Unexpected error during {request.state.instagram_stage}"
        code = getattr(exc, "code", None)
        if isinstance(code, str) and len(code) == 5 and code.isascii() and code.isalnum():
            request.state.instagram_error_details = {"database_error_code": code}
        raise HTTPException(status_code=503, detail="Connection service unavailable") from None
    response.headers["Cache-Control"] = "no-store"
    return {"status": "connected", "account_id": account_id}
