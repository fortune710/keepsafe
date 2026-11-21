from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError

from controllers.external_connections_controller import ExternalConnectionsController
from routers import instagram
from services import instagram_service as service
from utils.auth import get_current_user


class FakeRedis:
    def __init__(self):
        self.values = {}

    def set(self, key, value, ex, nx):
        assert ex == 600 and nx
        if key in self.values:
            return False
        self.values[key] = value
        return True

    def getdel(self, key):
        return self.values.pop(key, None)


@pytest.fixture
def setup(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(instagram, "get_redis_client", lambda: redis)
    monkeypatch.setattr(service.settings, "INSTAGRAM_TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setattr(service.settings, "META_INSTAGRAM_LOGIN_URL", "https://www.facebook.com/dialog/oauth?client_id=123&state=default&config_id=456")
    app = FastAPI()
    app.include_router(instagram.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user=SimpleNamespace(id="user-1"))
    return TestClient(app), redis


def begin(client):
    response = client.get("/instagram/connect")
    assert response.status_code == 200
    return parse_qs(urlsplit(response.json()["authorization_url"]).query)


def test_connect_auth_and_unique_state(setup):
    client, redis = setup
    first, second = begin(client), begin(client)
    assert first["client_id"] == ["123"] and first["config_id"] == ["456"]
    assert first["state"] != second["state"] and first["state"] != ["default"]
    assert redis.values[service.STATE_PREFIX + first["state"][0]] == "user-1"
    client.app.dependency_overrides.clear()
    assert client.get("/instagram/connect").status_code in (401, 403)


def test_callback_saves_encrypted_token_and_rejects_replay(setup, monkeypatch):
    client, redis = setup
    saved = []
    monkeypatch.setattr(service, "exchange_code", lambda code: {"access_token": "secret-token", "token_type": "bearer", "expires_in": 3600})
    monkeypatch.setattr(service, "get_single_account", lambda token: "ig-1")
    monkeypatch.setattr(instagram, "get_supabase_client", lambda: object())
    monkeypatch.setattr(ExternalConnectionsController, "save_instagram", lambda self, user, data: saved.append((user, data)))
    state = begin(client)["state"][0]
    response = client.get("/instagram/callback", params={"state": state, "code": "secret-code"})
    assert response.json() == {"status": "connected", "account_id": "ig-1"}
    assert "secret-token" not in response.text
    user, connection = saved[0]
    assert user == "user-1" and connection["access_token"] != "secret-token"
    assert service.decrypt_access_token(connection) == "secret-token"
    assert datetime.fromisoformat(connection["expires_at"]) > datetime.now(timezone.utc)
    assert client.get("/instagram/callback", params={"state": state, "code": "secret-code"}).status_code == 400


def test_invalid_expired_and_denied_state(setup):
    client, redis = setup
    assert client.get("/instagram/callback").status_code == 400
    assert client.get("/instagram/callback", params={"state": "unknown"}).status_code == 400
    expired = begin(client)["state"][0]
    redis.values.pop(service.STATE_PREFIX + expired)
    assert client.get("/instagram/callback", params={"state": expired, "code": "x"}).status_code == 400
    state = begin(client)["state"][0]
    assert client.get("/instagram/callback", params={"state": state, "error": "access_denied"}).status_code == 400
    assert client.get("/instagram/callback", params={"state": state, "code": "x"}).status_code == 400


def test_redis_and_provider_failures(setup, monkeypatch):
    client, redis = setup
    state = begin(client)["state"][0]
    monkeypatch.setattr(service, "exchange_code", lambda code: (_ for _ in ()).throw(service.InstagramProviderError()))
    assert client.get("/instagram/callback", params={"state": state, "code": "x"}).status_code == 502
    monkeypatch.setattr(instagram, "get_redis_client", lambda: None)
    assert client.get("/instagram/connect").status_code == 503
    monkeypatch.setattr(instagram, "get_redis_client", lambda: redis)
    monkeypatch.setattr(redis, "getdel", lambda key: (_ for _ in ()).throw(RedisConnectionError()))
    assert client.get("/instagram/callback", params={"state": "x"}).status_code == 503


def test_account_discovery_and_pagination(monkeypatch):
    pages = iter([{"data": [{"id": "1"}], "paging": {"next": "ignored", "cursors": {"after": "cursor"}}}, {"data": []}])
    monkeypatch.setattr(service, "_graph_get", lambda *a, **kw: next(pages))
    assert service.get_single_account("token") == "1"
    monkeypatch.setattr(service, "_graph_get", lambda *a, **kw: {"data": []})
    with pytest.raises(service.InstagramAccountError, match="No Instagram"):
        service.get_single_account("token")
    monkeypatch.setattr(service, "_graph_get", lambda *a, **kw: {"data": [{"id": "1"}, {"id": "2"}]})
    with pytest.raises(service.InstagramAccountError, match="More than one"):
        service.get_single_account("token")


def test_controller_upserts_only_instagram():
    calls = []
    class Table:
        def upsert(self, data, on_conflict):
            calls.append((data, on_conflict))
            return self
        def execute(self):
            return None
    class Supabase:
        def table(self, name):
            assert name == "external_connections"
            return Table()
    controller = ExternalConnectionsController(Supabase())
    controller.save_instagram("user-1", {"account_id": "old"})
    controller.save_instagram("user-1", {"account_id": "new"})
    assert calls == [({"user_id": "user-1", "instagram": {"account_id": "old"}}, "user_id"),
                     ({"user_id": "user-1", "instagram": {"account_id": "new"}}, "user_id")]


def test_meta_requests_use_config_and_bearer_header(setup, monkeypatch):
    monkeypatch.setattr(service.settings, "META_GRAPH_API_VERSION", "v27.0")
    monkeypatch.setattr(service.settings, "META_APP_ID", "app")
    monkeypatch.setattr(service.settings, "META_APP_SECRET", "secret")
    monkeypatch.setattr(service.settings, "META_INSTAGRAM_REDIRECT_URI", "https://example.com/instagram/callback")
    requests = []
    class FakeResponse(BytesIO):
        pass
    def open_request(request, timeout):
        requests.append(request)
        if "oauth/access_token" in request.full_url:
            return FakeResponse(b'{"access_token":"token","token_type":"bearer"}')
        return FakeResponse(b'{"data":[{"id":"42"}]}')
    monkeypatch.setattr(service, "urlopen", open_request)
    token = service.exchange_code("code")
    assert service.get_single_account(token["access_token"]) == "42"
    query = parse_qs(urlsplit(requests[0].full_url).query)
    assert query["client_id"] == ["app"] and query["client_secret"] == ["secret"]
    assert query["code"] == ["code"] and query["redirect_uri"] == ["https://example.com/instagram/callback"]
    assert requests[1].get_header("Authorization") == "Bearer token"
    assert "token" not in requests[1].full_url


def test_invalid_encryption_key_fails_closed(setup, monkeypatch):
    client, redis = setup
    monkeypatch.setattr(service.settings, "INSTAGRAM_TOKEN_ENCRYPTION_KEY", "bad-key")
    assert client.get("/instagram/connect").status_code == 503
    assert redis.values == {}
