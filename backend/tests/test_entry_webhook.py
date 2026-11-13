import os
import sys
import types
import hashlib
import hmac
import json

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _install_sendgrid_stub() -> None:
    sendgrid_module = types.ModuleType("sendgrid")
    helpers_module = types.ModuleType("sendgrid.helpers")
    mail_module = types.ModuleType("sendgrid.helpers.mail")

    class SendGridAPIClient:
        def __init__(self, *_args, **_kwargs):
            pass

    class Mail:
        def __init__(self, *args, **kwargs):
            pass

    sendgrid_module.SendGridAPIClient = SendGridAPIClient
    mail_module.Mail = Mail

    sys.modules.setdefault("sendgrid", sendgrid_module)
    sys.modules.setdefault("sendgrid.helpers", helpers_module)
    sys.modules.setdefault("sendgrid.helpers.mail", mail_module)


try:
    import sendgrid  # noqa: F401
except ModuleNotFoundError:
    _install_sendgrid_stub()

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from routers import webhooks


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(webhooks.router)
    return TestClient(app)


def test_entry_insert_webhook_queues_ingestion(monkeypatch):
    client = _build_client()
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "test-secret")

    async def fake_enqueue_entry(record, operation="upsert"):
        assert operation == "upsert"
        assert record["id"] == "entry-1"
        return True

    async def fake_notification(_record):
        return True

    monkeypatch.setattr(webhooks.entry_ingestion_queue_service, "enqueue_entry", fake_enqueue_entry)
    monkeypatch.setattr(webhooks.notification_enqueue_service, "enqueue_entry_notification", fake_notification)

    body = json.dumps({
            "type": "INSERT",
            "table": "entries",
            "record": {"id": "entry-1", "is_enqueued": False},
        }).encode()
    signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    response = client.post("/webhooks/entries", content=body, headers={"content-type": "application/json", "x-supabase-signature": signature})

    assert response.status_code == 200
    assert response.json()["ingestion"] == "queued"
    assert response.json()["notification"] == "success"


def test_entry_update_webhook_queues_reingestion(monkeypatch):
    client = _build_client()
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "test-secret")

    async def fake_enqueue_entry(record, operation="upsert"):
        assert operation == "upsert"
        return True

    monkeypatch.setattr(webhooks.entry_ingestion_queue_service, "enqueue_entry", fake_enqueue_entry)

    body = json.dumps({
            "type": "UPDATE",
            "table": "entries",
            "record": {"id": "entry-1", "is_enqueued": False},
        }).encode()
    signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    response = client.post("/webhooks/entries", content=body, headers={"content-type": "application/json", "x-supabase-signature": signature})

    assert response.status_code == 200
    assert response.json()["message"] == "Entry entry-1 queued for re-ingestion successfully"
