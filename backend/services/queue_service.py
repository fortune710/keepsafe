from __future__ import annotations

from typing import Any, Dict, List
import json
import logging

from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class QueueService:
    """Thin wrapper around pgmq queue operations."""

    def __init__(self):
        self.supabase = get_supabase_client()

    def send_message(
        self,
        *,
        queue_name: str,
        message: Dict[str, Any],
    ) -> Any:
        """Serialize and send a message to the requested queue."""
        logger.debug("Sending message to queue=%s", queue_name)
        return (
            self.supabase
            .schema("pgmq_public")
            .rpc(
                "send",
                {
                    "queue_name": queue_name,
                    "message": json.dumps(message),
                },
            )
            .execute()
        )

    @staticmethod
    def is_enqueue_response_valid(response: Any) -> bool:
        """Return whether a queue send response appears successful."""
        data = getattr(response, "data", None)
        if data is None:
            return False
        if isinstance(data, (list, dict, str)):
            return bool(data)
        if isinstance(data, (int, float, bool)):
            return bool(data)
        return True

    def read_messages(
        self,
        *,
        queue_name: str,
        batch_size: int,
        visibility_timeout_seconds: int,
    ) -> List[Dict[str, Any]]:
        """Read a batch of messages from a queue."""
        response = (
            self.supabase
            .schema("pgmq_public")
            .rpc(
                "read",
                {
                    "queue_name": queue_name,
                    "sleep_seconds": visibility_timeout_seconds,
                    "n": batch_size,
                },
            )
            .execute()
        )
        return response.data if response.data else []

    def delete_message(self, *, queue_name: str, message_id: int) -> Any:
        """Delete a message from the requested queue."""
        logger.debug("Deleting message from queue=%s msg_id=%s", queue_name, message_id)
        return (
            self.supabase
            .schema("pgmq_public")
            .rpc(
                "delete",
                {
                    "queue_name": queue_name,
                    "message_id": message_id,
                },
            )
            .execute()
        )
