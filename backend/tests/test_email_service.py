import os
import sys
from unittest.mock import MagicMock, patch

import types


def _install_sendgrid_stub() -> None:
    sendgrid_module = types.ModuleType("sendgrid")
    helpers_module = types.ModuleType("sendgrid.helpers")
    mail_module = types.ModuleType("sendgrid.helpers.mail")

    class SendGridAPIClient:
        def __init__(self, *_args, **_kwargs):
            pass

    class Mail:
        def __init__(self, from_email, to_emails, subject, plain_text_content):
            email, name = from_email
            self._payload = {
                "from": {"email": email, "name": name},
                "subject": subject,
                "content": [{"value": plain_text_content}],
                "personalizations": [{"to": [{"email": to_emails}]}],
            }

        def get(self):
            return self._payload

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

from services.email_service import EmailService


def test_send_entry_report_email_composes_payload_and_sends(monkeypatch):
    monkeypatch.setattr("services.email_service.settings.SENDGRID_API_KEY", "sg-key", raising=False)
    monkeypatch.setattr("services.email_service.settings.SENDGRID_FROM_EMAIL", "from@example.com", raising=False)
    monkeypatch.setattr("services.email_service.settings.SENDGRID_FROM_NAME", "KeepSafe", raising=False)
    monkeypatch.setattr(
        "services.email_service.settings.ENTRY_REPORT_NOTIFICATION_TO_EMAIL",
        "to@example.com",
        raising=False,
    )

    mock_client = MagicMock()
    mock_response = MagicMock(status_code=202)
    mock_client.send.return_value = mock_response

    with patch("services.email_service.SendGridAPIClient", return_value=mock_client):
        service = EmailService()

    payload = {
        "id": "report-1",
        "entry_id": "entry-9",
        "user_id": "user-3",
        "reason": "spam",
    }

    result = service.send_entry_report_email(payload)

    assert result is True
    mock_client.send.assert_called_once()

    mail_obj = mock_client.send.call_args.args[0]
    mail_payload = mail_obj.get()

    assert mail_payload["from"] == {"email": "from@example.com", "name": "KeepSafe"}
    assert mail_payload["subject"] == "New Entry Report Received (entry_id=entry-9)"
    assert mail_payload["content"][0]["value"] == (
        "A new entry report was received.\n\n"
        "report_id: report-1\n"
        "entry_id: entry-9\n"
        "user_id: user-3\n"
        "reason: spam\n"
    )
    assert mail_payload["personalizations"][0]["to"][0]["email"] == "to@example.com"


def test_send_entry_report_email_logs_and_returns_false_on_send_exception(monkeypatch, caplog):
    monkeypatch.setattr("services.email_service.settings.SENDGRID_API_KEY", "sg-key", raising=False)
    monkeypatch.setattr("services.email_service.settings.SENDGRID_FROM_EMAIL", "from@example.com", raising=False)
    monkeypatch.setattr("services.email_service.settings.SENDGRID_FROM_NAME", "KeepSafe", raising=False)
    monkeypatch.setattr(
        "services.email_service.settings.ENTRY_REPORT_NOTIFICATION_TO_EMAIL",
        "to@example.com",
        raising=False,
    )

    mock_client = MagicMock()
    mock_client.send.side_effect = RuntimeError("send failed")

    with patch("services.email_service.SendGridAPIClient", return_value=mock_client):
        service = EmailService()

    caplog.set_level("ERROR")
    result = service.send_entry_report_email(
        {"id": "report-2", "entry_id": "entry-2", "user_id": "user-2", "reason": "abuse"}
    )

    assert result is False
    assert "Failed to send entry report email" in caplog.text
    assert "SendGrid exception details: send failed" in caplog.text


def test_send_entry_report_email_without_api_key_logs_and_returns_false(monkeypatch, caplog):
    monkeypatch.setattr("services.email_service.settings.SENDGRID_API_KEY", "", raising=False)
    monkeypatch.setattr("services.email_service.settings.ENTRY_REPORT_NOTIFICATION_TO_EMAIL", "to@example.com", raising=False)

    service = EmailService()

    caplog.set_level("ERROR")
    result = service.send_entry_report_email(
        {"id": "report-3", "entry_id": "entry-3", "user_id": "user-3", "reason": "fraud"}
    )

    assert result is False
    assert "SendGrid API key is not configured; cannot send entry report email" in caplog.text
