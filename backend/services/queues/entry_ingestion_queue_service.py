from __future__ import annotations

from typing import Any, Dict, List, Optional
import asyncio
import json
import logging

from queue_constants import (
    ENTRY_INGESTION_BATCH_SIZE,
    ENTRY_INGESTION_CONCURRENCY,
    ENTRY_INGESTION_DLQ_LIMIT,
    ENTRY_INGESTION_DLQ_NAME,
    ENTRY_INGESTION_QUEUE_NAME,
)
from services.ingestion_service import IngestionService
from services.queue_service import QueueService
from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class EntryIngestionQueueService:
    """Queue-backed entry ingestion coordinator."""

    def __init__(self):
        self.supabase = get_supabase_client()
        self.queue_service = QueueService()
        self.queue_service.supabase = self.supabase
        self.ingestion_service = IngestionService()
        self.queue_name = ENTRY_INGESTION_QUEUE_NAME
        self.dlq_name = ENTRY_INGESTION_DLQ_NAME
        self.batch_size = ENTRY_INGESTION_BATCH_SIZE
        self.dlq_limit = ENTRY_INGESTION_DLQ_LIMIT
        self.semaphore = asyncio.Semaphore(ENTRY_INGESTION_CONCURRENCY)

        logger.info(
            "EntryIngestionQueueService initialized: queue=%s dlq=%s batch_size=%s concurrency=%s dlq_limit=%s",
            self.queue_name,
            self.dlq_name,
            self.batch_size,
            ENTRY_INGESTION_CONCURRENCY,
            self.dlq_limit,
        )

    async def enqueue_entry(self, entry: Dict[str, Any], operation: str = "upsert") -> bool:
        """Queue an entry for ingestion if it is not already queued."""
        entry_id = entry.get("id")
        if not entry_id:
            logger.warning("Entry ingestion enqueue skipped: missing entry_id")
            return False

        if not self._try_set_entry_enqueued_atomic(entry_id):
            logger.info(
                "Entry ingestion enqueue skipped because entry is already queued or unavailable: entry_id=%s operation=%s",
                entry_id,
                operation,
            )
            return True

        message = {
            "entry_id": entry_id,
            "operation": operation,
            "failure_count": 0,
        }

        try:
            response = self.queue_service.send_message(queue_name=self.queue_name, message=message)
            if not self.queue_service.is_enqueue_response_valid(response):
                raise ValueError(
                    f"Invalid entry ingestion enqueue response for entry_id={entry_id}: {getattr(response, 'data', None)}"
                )
            logger.info(
                "Entry queued for ingestion: entry_id=%s operation=%s queue=%s",
                entry_id,
                operation,
                self.queue_name,
            )
            return True
        except Exception as exc:
            self._rollback_entry_enqueued_status(entry_id)
            logger.error(
                "Failed to enqueue entry ingestion job: entry_id=%s operation=%s error=%s",
                entry_id,
                operation,
                str(exc),
                exc_info=True,
            )
            return False

    async def process_queue(self, queue_name: Optional[str] = None) -> Dict[str, int]:
        """Process queued entry ingestion jobs."""
        stats = {
            "processed": 0,
            "succeeded": 0,
            "failed": 0,
            "moved_to_dlq": 0,
            "discarded": 0,
        }

        try:
            target_queue_name = queue_name or self.queue_name
            logger.info(
                "Starting entry ingestion queue processing: queue=%s batch_size=%s",
                target_queue_name,
                self.batch_size,
            )
            messages = self.queue_service.read_messages(
                queue_name=target_queue_name,
                batch_size=self.batch_size,
                visibility_timeout_seconds=300,
            )
            if not messages:
                logger.info("No entry ingestion messages available: queue=%s", target_queue_name)
                return stats

            await asyncio.gather(*(self._process_message(message, stats, target_queue_name) for message in messages))
            logger.info("Completed entry ingestion queue processing: queue=%s stats=%s", target_queue_name, stats)
        except Exception as exc:
            logger.error(
                "Entry ingestion queue processing failed: queue=%s error=%s",
                queue_name or self.queue_name,
                str(exc),
                exc_info=True,
            )

        return stats

    async def process_dlq(self) -> Dict[str, int]:
        """Process messages currently stored in the entry ingestion DLQ."""
        return await self.process_queue(queue_name=self.dlq_name)

    async def _process_message(
        self,
        message: Dict[str, Any],
        stats: Dict[str, int],
        source_queue_name: str,
    ) -> None:
        msg_id = message.get("msg_id")
        raw_message = message.get("message", "{}")
        msg_data = json.loads(raw_message) if isinstance(raw_message, str) else raw_message
        entry_id = msg_data.get("entry_id")
        operation = msg_data.get("operation", "upsert")
        failure_count = msg_data.get("failure_count", 0)

        stats["processed"] += 1

        if not msg_id or not entry_id:
            logger.warning(
                "Dropping invalid entry ingestion message: queue=%s msg_id=%s entry_id=%s",
                source_queue_name,
                msg_id,
                entry_id,
            )
            if msg_id:
                self.queue_service.delete_message(queue_name=source_queue_name, message_id=msg_id)
            stats["failed"] += 1
            return

        try:
            async with self.semaphore:
                entry = self._get_entry(entry_id)
                if not entry:
                    logger.info(
                        "Skipping queued ingestion because entry no longer exists: queue=%s msg_id=%s entry_id=%s",
                        source_queue_name,
                        msg_id,
                        entry_id,
                    )
                    self.queue_service.delete_message(queue_name=source_queue_name, message_id=msg_id)
                    stats["succeeded"] += 1
                    return

                if operation != "upsert":
                    raise ValueError(f"Unsupported entry ingestion operation: {operation}")

                success = await self.ingestion_service.ingest_entry(entry)
                if success:
                    self.queue_service.delete_message(queue_name=source_queue_name, message_id=msg_id)
                    self._set_entry_enqueued_status(entry_id=entry_id, is_enqueued=False)
                    stats["succeeded"] += 1
                    logger.info(
                        "Entry ingestion job succeeded: queue=%s msg_id=%s entry_id=%s",
                        source_queue_name,
                        msg_id,
                        entry_id,
                    )
                    return

                await self._handle_failure(
                    msg_id=msg_id,
                    message_data=msg_data,
                    failure_count=failure_count,
                    source_queue_name=source_queue_name,
                    stats=stats,
                )
        except Exception as exc:
            logger.error(
                "Entry ingestion job failed with exception: queue=%s msg_id=%s entry_id=%s error=%s",
                source_queue_name,
                msg_id,
                entry_id,
                str(exc),
                exc_info=True,
            )
            await self._handle_failure(
                msg_id=msg_id,
                message_data=msg_data,
                failure_count=failure_count,
                source_queue_name=source_queue_name,
                stats=stats,
            )

    async def _handle_failure(
        self,
        *,
        msg_id: int,
        message_data: Dict[str, Any],
        failure_count: int,
        source_queue_name: str,
        stats: Dict[str, int],
    ) -> None:
        entry_id = message_data.get("entry_id")
        new_failure_count = failure_count + 1
        message_data["failure_count"] = new_failure_count

        try:
            if new_failure_count <= self.dlq_limit:
                response = self.queue_service.send_message(queue_name=self.dlq_name, message=message_data)
                if not self.queue_service.is_enqueue_response_valid(response):
                    raise ValueError(
                        f"Invalid entry ingestion DLQ enqueue response for entry_id={entry_id}: {getattr(response, 'data', None)}"
                    )
                self.queue_service.delete_message(queue_name=source_queue_name, message_id=msg_id)
                stats["moved_to_dlq"] += 1
                logger.warning(
                    "Entry ingestion job moved to DLQ: source_queue=%s dlq=%s msg_id=%s entry_id=%s failure_count=%s",
                    source_queue_name,
                    self.dlq_name,
                    msg_id,
                    entry_id,
                    new_failure_count,
                )
            else:
                self.queue_service.delete_message(queue_name=source_queue_name, message_id=msg_id)
                self._set_entry_enqueued_status(entry_id=entry_id, is_enqueued=False)
                stats["discarded"] += 1
                logger.error(
                    "Entry ingestion job discarded after DLQ limit: queue=%s msg_id=%s entry_id=%s failure_count=%s",
                    source_queue_name,
                    msg_id,
                    entry_id,
                    new_failure_count,
                )
        except Exception as exc:
            logger.error(
                "Failed to move entry ingestion message to DLQ: queue=%s msg_id=%s entry_id=%s error=%s",
                source_queue_name,
                msg_id,
                entry_id,
                str(exc),
                exc_info=True,
            )
        finally:
            stats["failed"] += 1

    def _get_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the latest entry state from the database."""
        try:
            response = self.supabase.table("entries").select("*").eq("id", entry_id).maybe_single().execute()
            return response.data if response.data else None
        except Exception as exc:
            logger.error(
                "Failed to fetch entry for ingestion: entry_id=%s error=%s",
                entry_id,
                str(exc),
                exc_info=True,
            )
            raise

    def _set_entry_enqueued_status(self, *, entry_id: str, is_enqueued: bool) -> None:
        """Persist queue state for an entry."""
        try:
            self.supabase.table("entries").update({"is_enqueued": is_enqueued}).eq("id", entry_id).execute()
            logger.info(
                "Updated entry queue status: entry_id=%s is_enqueued=%s",
                entry_id,
                is_enqueued,
            )
        except Exception as exc:
            logger.error(
                "Failed to update entry queue status: entry_id=%s is_enqueued=%s error=%s",
                entry_id,
                is_enqueued,
                str(exc),
                exc_info=True,
            )
            raise

    def _try_set_entry_enqueued_atomic(self, entry_id: str) -> bool:
        """Atomically flip `is_enqueued` from false to true for an entry."""
        try:
            response = (
                self.supabase.table("entries")
                .update({"is_enqueued": True})
                .eq("id", entry_id)
                .eq("is_enqueued", False)
                .select("id")
                .execute()
            )
            updated_rows = response.data or []
            return len(updated_rows) > 0
        except Exception as exc:
            logger.error(
                "Failed to atomically update entry queue status: entry_id=%s error=%s",
                entry_id,
                str(exc),
                exc_info=True,
            )
            raise

    def _rollback_entry_enqueued_status(self, entry_id: str) -> None:
        """Best-effort rollback for an atomic enqueue flag flip."""
        try:
            self._set_entry_enqueued_status(entry_id=entry_id, is_enqueued=False)
        except Exception:
            logger.error(
                "Failed to roll back entry queue status after enqueue failure: entry_id=%s",
                entry_id,
                exc_info=True,
            )
