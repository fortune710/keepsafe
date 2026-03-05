import hashlib
import hmac
import json
import os
import sys
import types

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
        def __init__(self, from_email, to_emails, subject, plain_text_content):
            self.from_email = from_email
            self.to_emails = to_emails
            self.subject = subject
            self.plain_text_content = plain_text_content

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


def _signed_headers(secret: str, body: bytes) -> dict:
    signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return {
        "content-type": "application/json",
        "x-supabase-signature": signature,
    }


def _valid_payload() -> dict:
    return {
        "type": "INSERT",
        "table": "entry_reports",
        "record": {
            "id": "report-1",
            "user_id": "user-1",
            "entry_id": "entry-1",
            "reason": "spam",
        },
    }


def _build_client() -> TestClient:
    app = FastAPI()
    app.include_router(webhooks.router)
    return TestClient(app)


def test_entry_report_webhook_success(monkeypatch, caplog):
    client = _build_client()
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "test-secret", raising=False)

    calls = []

    def fake_send_email(report_payload):
        calls.append(report_payload)
        return True

    monkeypatch.setattr(webhooks.email_service, "send_entry_report_email", fake_send_email)

    payload = _valid_payload()
    body = json.dumps(payload).encode("utf-8")
    caplog.set_level("INFO")

    response = client.post("/webhooks/entry-reports", content=body, headers=_signed_headers("test-secret", body))

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "message": "Entry report report-1 processed successfully",
        "entry_report_id": "report-1",
    }
    assert calls == [payload["record"]]
    assert "Entry report webhook request received" in caplog.text
    assert "Attempting entry report email dispatch" in caplog.text
    assert "Entry report email dispatch succeeded" in caplog.text


def test_entry_report_webhook_validation_failure_missing_fields(monkeypatch):
    client = _build_client()
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "test-secret", raising=False)

    called = False

    def fake_send_email(_):
        nonlocal called
        called = True
        return True

    monkeypatch.setattr(webhooks.email_service, "send_entry_report_email", fake_send_email)

    payload = {
        "type": "INSERT",
        "table": "entry_reports",
        "record": {
            "id": "report-2",
            "user_id": "user-2",
            "entry_id": "entry-2",
        },
    }
    body = json.dumps(payload).encode("utf-8")

    response = client.post("/webhooks/entry-reports", content=body, headers=_signed_headers("test-secret", body))

    assert response.status_code == 422
    assert called is False


def test_entry_report_webhook_send_failure_returns_500(monkeypatch, caplog):
    client = _build_client()
    monkeypatch.setattr(webhooks.settings, "SUPABASE_WEBHOOK_SECRET", "test-secret", raising=False)
    monkeypatch.setattr(webhooks.email_service, "send_entry_report_email", lambda _: False)

    payload = _valid_payload()
    body = json.dumps(payload).encode("utf-8")
    caplog.set_level("INFO")

    response = client.post("/webhooks/entry-reports", content=body, headers=_signed_headers("test-secret", body))

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to dispatch entry report email"
    assert "Entry report webhook request received" in caplog.text
    assert "Attempting entry report email dispatch" in caplog.text
    assert "Entry report email dispatch failed" in caplog.text
