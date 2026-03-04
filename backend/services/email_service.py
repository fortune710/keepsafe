import logging

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications with SendGrid."""

    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.SENDGRID_FROM_EMAIL
        self.from_name = settings.SENDGRID_FROM_NAME
        self.to_email = settings.ENTRY_REPORT_NOTIFICATION_TO_EMAIL
        self.client = SendGridAPIClient(self.api_key) if self.api_key else None

    def send_entry_report_email(self, report_payload: dict) -> bool:
        """Send an entry report notification email."""
        if not self.client:
            logger.error("SendGrid API key is not configured; cannot send entry report email")
            return False

        report_id = report_payload.get("id")
        entry_id = report_payload.get("entry_id")
        user_id = report_payload.get("user_id")
        reason = report_payload.get("reason")

        logger.info(
            "Attempting to send entry report email",
            extra={
                "report_id": report_id,
                "entry_id": entry_id,
                "user_id": user_id,
                "recipient": self.to_email,
            },
        )

        subject = f"New Entry Report Received (entry_id={entry_id})"
        body = (
            "A new entry report was received.\n\n"
            f"report_id: {report_id}\n"
            f"entry_id: {entry_id}\n"
            f"user_id: {user_id}\n"
            f"reason: {reason}\n"
        )

        message = Mail(
            from_email=(self.from_email, self.from_name),
            to_emails=self.to_email,
            subject=subject,
            plain_text_content=body,
        )

        try:
            response = self.client.send(message)
            logger.info(
                "Entry report email sent successfully",
                extra={
                    "report_id": report_id,
                    "entry_id": entry_id,
                    "user_id": user_id,
                    "status_code": response.status_code,
                },
            )
            return True
        except Exception as exc:
            logger.error(
                "Failed to send entry report email",
                extra={
                    "report_id": report_id,
                    "entry_id": entry_id,
                    "user_id": user_id,
                    "reason": reason,
                    "recipient": self.to_email,
                },
                exc_info=True,
            )
            logger.error("SendGrid exception details: %s", exc)
            return False
