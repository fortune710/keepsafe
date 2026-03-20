"""Central queue configuration constants for backend queue processors."""

from __future__ import annotations

import os


def _get_int_env(key: str, default: int) -> int:
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


NOTIFICATION_QUEUE_NAME = "notifications_q"
NOTIFICATION_DLQ_NAME = "notifications_dlq"
NOTIFICATION_CONCURRENCY = _get_int_env("NOTIFICATION_CONCURRENCY", 20)
NOTIFICATION_BATCH_SIZE = _get_int_env("NOTIFICATION_BATCH_SIZE", 100)
NOTIFICATION_DLQ_LIMIT = _get_int_env("NOTIFICATION_DLQ_LIMIT", 3)
NOTIFICATION_INTERVAL_MINUTES = _get_int_env("NOTIFICATION_INTERVAL_MINUTES", 5)

ENTRY_INGESTION_QUEUE_NAME = "entry_ingestion_queue"
ENTRY_INGESTION_DLQ_NAME = "entry_ingestion_dlq"
ENTRY_INGESTION_CONCURRENCY = _get_int_env("ENTRY_INGESTION_CONCURRENCY", 5)
ENTRY_INGESTION_BATCH_SIZE = _get_int_env("ENTRY_INGESTION_BATCH_SIZE", 20)
ENTRY_INGESTION_DLQ_LIMIT = _get_int_env("ENTRY_INGESTION_DLQ_LIMIT", 3)
ENTRY_INGESTION_INTERVAL_MINUTES = _get_int_env("ENTRY_INGESTION_INTERVAL_MINUTES", 1)
