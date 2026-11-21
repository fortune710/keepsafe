import json
import secrets
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from cryptography.fernet import Fernet

from config import settings


STATE_TTL_SECONDS = 600
STATE_PREFIX = "instagram:oauth:"


class InstagramConfigurationError(Exception):
    pass


class InstagramProviderError(Exception):
    pass


class InstagramAccountError(Exception):
    pass


def token_cipher():
    try:
        return Fernet(settings.INSTAGRAM_TOKEN_ENCRYPTION_KEY.encode("ascii"))
    except (ValueError, TypeError, UnicodeError, AttributeError) as exc:
        raise InstagramConfigurationError from exc


def decrypt_access_token(connection):
    return token_cipher().decrypt(connection["access_token"].encode("ascii")).decode("utf-8")


def create_authorization_url(redis_client, user_id):
    token_cipher()
    url = urlsplit(settings.META_INSTAGRAM_LOGIN_URL)
    if url.scheme != "https" or url.hostname not in {"facebook.com", "www.facebook.com"}:
        raise InstagramConfigurationError
    query = [(key, value) for key, value in parse_qsl(url.query, keep_blank_values=True) if key != "state"]
    state = secrets.token_urlsafe(32)
    query.append(("state", state))
    if not redis_client.set(STATE_PREFIX + state, str(user_id), ex=STATE_TTL_SECONDS, nx=True):
        raise InstagramConfigurationError
    return urlunsplit((url.scheme, url.netloc, url.path, urlencode(query), url.fragment))


def _graph_get(path, params=None, access_token=None):
    version = settings.META_GRAPH_API_VERSION
    if not version or not version.startswith("v") or not all(part.isdigit() for part in version[1:].split(".")):
        raise InstagramConfigurationError
    url = f"https://graph.facebook.com/{version}/{path}"
    if params:
        url += "?" + urlencode(params)
    headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}
    try:
        with urlopen(Request(url, headers=headers), timeout=15) as response:
            data = json.load(response)
        if not isinstance(data, dict) or "error" in data:
            raise InstagramProviderError
        return data
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        raise InstagramProviderError from exc


def exchange_code(code):
    if not all((settings.META_APP_ID, settings.META_APP_SECRET, settings.META_INSTAGRAM_REDIRECT_URI)):
        raise InstagramConfigurationError
    result = _graph_get("oauth/access_token", {
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "redirect_uri": settings.META_INSTAGRAM_REDIRECT_URI,
        "code": code,
    })
    if not isinstance(result.get("access_token"), str) or not result["access_token"]:
        raise InstagramProviderError
    return result


def get_single_account(access_token):
    accounts = set()
    cursor = None
    seen_cursors = set()
    while True:
        params = {"fields": "id", "limit": 100}
        if cursor:
            params["after"] = cursor
        result = _graph_get("me/assigned_instagram_accounts", params, access_token)
        data = result.get("data")
        if not isinstance(data, list) or any(not isinstance(item, dict) or not item.get("id") for item in data):
            raise InstagramProviderError
        accounts.update(str(item["id"]) for item in data)
        if len(accounts) > 1:
            raise InstagramAccountError("More than one Instagram account is available")
        paging = result.get("paging") or {}
        if not isinstance(paging, dict):
            raise InstagramProviderError
        if not paging.get("next"):
            break
        cursors = paging.get("cursors") or {}
        cursor = cursors.get("after") if isinstance(cursors, dict) else None
        if not isinstance(cursor, str) or not cursor or cursor in seen_cursors:
            raise InstagramProviderError
        seen_cursors.add(cursor)
    if not accounts:
        raise InstagramAccountError("No Instagram account is available")
    return next(iter(accounts))


def make_connection(account_id, token_response):
    now = datetime.now(timezone.utc)
    token = token_response["access_token"]
    connection = {
        "account_id": account_id,
        "access_token": token_cipher().encrypt(token.encode("utf-8")).decode("ascii"),
        "token_type": token_response.get("token_type"),
        "connected_at": now.isoformat(),
    }
    expires_in = token_response.get("expires_in")
    if expires_in is not None:
        try:
            seconds = int(expires_in)
            if seconds < 0:
                raise ValueError
            connection["expires_at"] = (now + timedelta(seconds=seconds)).isoformat()
        except (ValueError, TypeError, OverflowError) as exc:
            raise InstagramProviderError from exc
    return connection
