import importlib
import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import queue_constants


def test_get_int_env_enforces_minimum_bound(monkeypatch):
    monkeypatch.setenv("TEST_QUEUE_INT", "0")
    assert queue_constants._get_int_env("TEST_QUEUE_INT", 5, min_value=1) == 5

    monkeypatch.setenv("TEST_QUEUE_INT", "-2")
    assert queue_constants._get_int_env("TEST_QUEUE_INT", 5, min_value=1) == 5

    monkeypatch.setenv("TEST_QUEUE_INT", "7")
    assert queue_constants._get_int_env("TEST_QUEUE_INT", 5, min_value=1) == 7


def test_queue_module_constants_fall_back_to_safe_defaults(monkeypatch):
    monkeypatch.setenv("NOTIFICATION_CONCURRENCY", "0")
    monkeypatch.setenv("NOTIFICATION_BATCH_SIZE", "-1")
    monkeypatch.setenv("NOTIFICATION_DLQ_LIMIT", "0")
    monkeypatch.setenv("NOTIFICATION_INTERVAL_MINUTES", "-3")
    monkeypatch.setenv("ENTRY_INGESTION_CONCURRENCY", "0")
    monkeypatch.setenv("ENTRY_INGESTION_BATCH_SIZE", "-5")
    monkeypatch.setenv("ENTRY_INGESTION_DLQ_LIMIT", "0")
    monkeypatch.setenv("ENTRY_INGESTION_INTERVAL_MINUTES", "-1")

    reloaded = importlib.reload(queue_constants)

    assert reloaded.NOTIFICATION_DEAD_QUEUE_NAME == "notification_dead_queue"
    assert reloaded.NOTIFICATION_CONCURRENCY == 20
    assert reloaded.NOTIFICATION_BATCH_SIZE == 100
    assert reloaded.NOTIFICATION_DLQ_LIMIT == 3
    assert reloaded.NOTIFICATION_INTERVAL_MINUTES == 5
    assert reloaded.ENTRY_INGESTION_DEAD_QUEUE_NAME == "entry_ingestion_dead_queue"
    assert reloaded.ENTRY_INGESTION_CONCURRENCY == 5
    assert reloaded.ENTRY_INGESTION_BATCH_SIZE == 20
    assert reloaded.ENTRY_INGESTION_DLQ_LIMIT == 3
    assert reloaded.ENTRY_INGESTION_INTERVAL_MINUTES == 1

    importlib.reload(queue_constants)
