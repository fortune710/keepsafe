import hashlib
import hmac
import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers import webhooks


@pytest.mark.parametrize("path", ["/webhooks/entries", "/webhooks/entry-reports", "/webhooks/friends"])
def test_webhook_authenticates_exact_body(monkeypatch, path):
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "test-secret")
    app = FastAPI()
    app.include_router(webhooks.router)
    client = TestClient(app)
    body = json.dumps({"type": "INSERT", "table": "other"}).encode()
    signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    headers = {"content-type": "application/json", "x-supabase-signature": signature}

    assert client.post(path, content=body, headers=headers).status_code == 200
    assert client.post(path, content=body, headers={"content-type": "application/json"}).status_code == 401
    assert client.post(path, content=body, headers={**headers, "x-supabase-signature": "0" * 64}).status_code == 401
    assert client.post(path, content=body + b" ", headers=headers).status_code == 401
    assert client.post(path, content=body, headers={**headers, "x-supabase-signature": "not-a-signature"}).status_code == 401


def test_webhook_fails_closed_without_secret(monkeypatch):
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "")
    app = FastAPI()
    app.include_router(webhooks.router)
    response = TestClient(app).post("/webhooks/entries", json={"type": "INSERT", "table": "entries"})
    assert response.status_code == 500
