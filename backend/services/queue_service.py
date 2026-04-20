from __future__ import annotations

from typing import Any, Dict, List
import json

from services.supabase_client import get_supabase_client
from utils.logging import Logger

logger = Logger("QueueService")


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
        logger.debug(
            "Sending message to queue",
            {
                "queue_name": queue_name,
                "message_keys": list(message.keys()),
            },
        )
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

    def send_message_batch(
        self,
        *,
        queue_name: str,
        messages: List[Dict[str, Any]],
    ) -> Any:
        """Serialize and send a batch of messages to the requested queue."""
        logger.debug(
            "Sending batch of messages to queue",
            {
                "queue_name": queue_name,
                "message_count": len(messages),
            },
        )
        # Assuming pgmq.send_batch expects an array of JSON objects or jsonb[]
        # We can pass an array of serialized strings or array of dicts depending on RPC definition.
        # usually pgmq extension expects a JSON array of messages.
        return (
            self.supabase
            .schema("pgmq_public")
            .rpc(
                "send_batch",
                {
                    "queue_name": queue_name,
                    "messages": [json.dumps(msg) for msg in messages],
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
        logger.debug(
            "Read messages from queue",
            {
                "queue_name": queue_name,
                "batch_size": batch_size,
                "visibility_timeout_seconds": visibility_timeout_seconds,
                "messages_found": len(response.data) if response and response.data else 0,
            },
        )
        return response.data if response.data else []

    def delete_message(self, *, queue_name: str, message_id: int) -> Any:
        """Delete a message from the requested queue."""
        logger.debug(
            "Deleting message from queue",
            {
                "queue_name": queue_name,
                "message_id": message_id,
            },
        )
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
