"""Central queue configuration constants for backend queue processors."""

from __future__ import annotations

import os


def _get_int_env(key: str, default: int, min_value: int = 0) -> int:
    value = os.getenv(key)
    if value is None:
        return max(default, min_value)
    try:
        parsed_value = int(value)
    except (TypeError, ValueError):
        return max(default, min_value)
    if parsed_value < min_value:
        return max(default, min_value)
    return parsed_value


NOTIFICATION_QUEUE_NAME = "notifications_queue"
NOTIFICATION_DLQ_NAME = "notifications_dlq"
NOTIFICATION_DEAD_QUEUE_NAME = "notification_dead_queue"
NOTIFICATION_CONCURRENCY = _get_int_env("NOTIFICATION_CONCURRENCY", 20, min_value=1)
NOTIFICATION_BATCH_SIZE = _get_int_env("NOTIFICATION_BATCH_SIZE", 100, min_value=1)
NOTIFICATION_DLQ_LIMIT = _get_int_env("NOTIFICATION_DLQ_LIMIT", 3, min_value=1)
NOTIFICATION_INTERVAL_MINUTES = _get_int_env("NOTIFICATION_INTERVAL_MINUTES", 5, min_value=1)

ENTRY_INGESTION_QUEUE_NAME = "entry_ingestion_queue"
ENTRY_INGESTION_DLQ_NAME = "entry_ingestion_dlq"
ENTRY_INGESTION_DEAD_QUEUE_NAME = "entry_ingestion_dead_queue"
ENTRY_INGESTION_CONCURRENCY = _get_int_env("ENTRY_INGESTION_CONCURRENCY", 5, min_value=1)
ENTRY_INGESTION_BATCH_SIZE = _get_int_env("ENTRY_INGESTION_BATCH_SIZE", 20, min_value=1)
ENTRY_INGESTION_DLQ_LIMIT = _get_int_env("ENTRY_INGESTION_DLQ_LIMIT", 3, min_value=1)
ENTRY_INGESTION_INTERVAL_MINUTES = _get_int_env("ENTRY_INGESTION_INTERVAL_MINUTES", 1, min_value=1)

MONTHLY_DUMP_QUEUE_NAME = "monthly_dump_queue"
MONTHLY_DUMP_DLQ_NAME = "monthly_dump_dlq"
MONTHLY_DUMP_DEAD_QUEUE_NAME = "monthly_dump_dead_queue"
MONTHLY_DUMP_CONCURRENCY = _get_int_env("MONTHLY_DUMP_CONCURRENCY", 3, min_value=1)
MONTHLY_DUMP_BATCH_SIZE = _get_int_env("MONTHLY_DUMP_BATCH_SIZE", 10, min_value=1)
MONTHLY_DUMP_DLQ_LIMIT = _get_int_env("MONTHLY_DUMP_DLQ_LIMIT", 3, min_value=1)
MONTHLY_DUMP_INTERVAL_MINUTES = _get_int_env("MONTHLY_DUMP_INTERVAL_MINUTES", 5, min_value=1)
MONTHLY_DUMP_ENQUEUE_INTERVAL_MINUTES = _get_int_env("MONTHLY_DUMP_ENQUEUE_INTERVAL_MINUTES", 30, min_value=1)
MONTHLY_DUMP_ENQUEUE_BATCH_SIZE = _get_int_env("MONTHLY_DUMP_ENQUEUE_BATCH_SIZE", 100, min_value=1)

TIME_CAPSULE_INTERVAL_MINUTES = _get_int_env("TIME_CAPSULE_INTERVAL_MINUTES", 5, min_value=1)
TIME_CAPSULE_BATCH_SIZE = _get_int_env("TIME_CAPSULE_BATCH_SIZE", 200, min_value=1)
