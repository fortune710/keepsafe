

from typing import Any, Dict, Optional, List
import json
import logging
import random
from datetime import datetime, timezone

from services.queue_service import QueueService
from services.supabase_client import get_supabase_client
from services.monthly_dump_service import MonthlyDumpService, MonthlyDumpInputs
from services.notification_enqueue_service import NotificationEnqueueService
from controllers.monthly_dump_controller import MonthlyDumpController
from database.tables import DatabaseTables
from queue_constants import (
    MONTHLY_DUMP_QUEUE_NAME,
    MONTHLY_DUMP_DLQ_NAME,
    MONTHLY_DUMP_DEAD_QUEUE_NAME,
    MONTHLY_DUMP_BATCH_SIZE,
    MONTHLY_DUMP_DLQ_LIMIT,
)

logger = logging.getLogger(__name__)


class MonthlyDumpQueueService:
    """Queue-backed monthly dump processor."""

    def __init__(self) -> None:
        self.supabase = get_supabase_client()
        self.queue_service = QueueService()
        self.queue_service.supabase = self.supabase
        self.queue_name = MONTHLY_DUMP_QUEUE_NAME
        self.dlq_name = MONTHLY_DUMP_DLQ_NAME
        self.dead_queue_name = MONTHLY_DUMP_DEAD_QUEUE_NAME
        self.batch_size = MONTHLY_DUMP_BATCH_SIZE
        self.dlq_limit = MONTHLY_DUMP_DLQ_LIMIT
        self.dump_service = MonthlyDumpService(self.supabase)
        self.dump_controller = MonthlyDumpController(self.supabase)

        logger.info(
            "MonthlyDumpQueueService initialized",
            extra={
                "queue": self.queue_name,
                "dlq": self.dlq_name,
                "dead_queue": self.dead_queue_name,
                "batch_size": self.batch_size,
                "dlq_limit": self.dlq_limit,
            },
        )

    def enqueue_dump(self, monthly_dump_id: str, user_id: str, month: str, timezone_name: str) -> bool:
        seed = random.randint(1, 2_000_000_000)
        payload = {
            "monthly_dump_id": monthly_dump_id,
            "user_id": user_id,
            "month": month,
            "timezone": timezone_name,
            "random_seed": seed,
            "failure_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        response = self.queue_service.send_message(
            queue_name=self.queue_name,
            message=payload,
        )
        if not self.queue_service.is_enqueue_response_valid(response):
            logger.error(
                "Monthly dump enqueue returned invalid response",
                extra={"monthly_dump_id": monthly_dump_id, "queue": self.queue_name},
            )
            return False

        logger.info(
            "Monthly dump enqueued",
            extra={"monthly_dump_id": monthly_dump_id, "user_id": user_id, "month": month},
        )
        return True

    async def process_queue(self) -> Dict[str, int]:
        stats = {
            "processed": 0,
            "succeeded": 0,
            "failed": 0,
            "moved_to_dlq": 0,
            "moved_to_dead": 0,
        }

        messages = self.queue_service.read_messages(
            queue_name=self.queue_name,
            batch_size=self.batch_size,
            visibility_timeout_seconds=300,
        )
        if not messages:
            logger.info("No monthly dump messages available", extra={"queue": self.queue_name})
            return stats

        # Group completed dump messages by month so notification enqueue happens
        # before we acknowledge/delete the source queue message.
        month_to_messages: Dict[str, List[Dict[str, Any]]] = {}

        for message in messages:
            # We need the month from the message data to group notifications
            msg_str = message.get("message", "{}")
            try:
                msg_data = json.loads(msg_str) if isinstance(msg_str, str) else msg_str
                msg_month = msg_data.get("month")
            except Exception:
                msg_month = None

            user_id = await self._process_message(message, stats)
            if not user_id or not msg_month:
                continue

            if msg_month not in month_to_messages:
                month_to_messages[msg_month] = []

            month_to_messages[msg_month].append({
                "msg_id": message.get("msg_id"),
                "user_id": user_id,
            })

        if not month_to_messages:
            return stats

        notification_enqueue_service = NotificationEnqueueService()
        for msg_month, month_messages in month_to_messages.items():
            user_ids = list(dict.fromkeys(
                message["user_id"]
                for message in month_messages
                if message.get("user_id")
            ))
            if not user_ids:
                continue

            enqueue_success = await notification_enqueue_service.enqueue_monthly_dump_notifications(
                user_ids,
                msg_month,
            )
            if not enqueue_success:
                logger.warning(
                    "Failed to enqueue monthly dump notifications",
                    extra={"queue": self.queue_name, "month": msg_month, "user_count": len(user_ids)},
                )
                stats["failed"] += len(month_messages)
                continue

            for message in month_messages:
                msg_id = message.get("msg_id")
                if msg_id is None:
                    continue

                try:
                    self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
                    stats["succeeded"] += 1
                except Exception as delete_exc:  # noqa: BLE001
                    logger.error(
                        "Failed to delete monthly dump queue message after notification enqueue",
                        extra={
                            "queue": self.queue_name,
                            "msg_id": msg_id,
                            "month": msg_month,
                            "error": str(delete_exc),
                        },
                    )
                    stats["failed"] += 1

        logger.info(
            "Monthly dump queue processing complete",
            extra={"queue": self.queue_name, "stats": stats},
        )
        return stats

    async def _process_message(self, message: Dict[str, Any], stats: Dict[str, int]) -> Optional[str]:
        stats["processed"] += 1
        msg_id = message.get("msg_id")
        msg_str = message.get("message", "{}")
        try:
            msg_data = json.loads(msg_str) if isinstance(msg_str, str) else msg_str
            if not isinstance(msg_data, dict):
                raise ValueError("Message data is not a dictionary")
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(
                "Malformed JSON in monthly dump message",
                extra={"msg_id": msg_id, "error": str(e), "queue": self.queue_name},
            )
            if msg_id is not None:
                self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
            stats["failed"] += 1
            return None

        monthly_dump_id = msg_data.get("monthly_dump_id")
        user_id = msg_data.get("user_id")
        month = msg_data.get("month")
        timezone_name = msg_data.get("timezone") or "UTC"
        seed = msg_data.get("random_seed")
        failure_count = msg_data.get("failure_count", 0)

        if not monthly_dump_id or not user_id or not month:
            logger.warning(
                "Invalid monthly dump message",
                extra={"msg_id": msg_id, "queue": self.queue_name},
            )
            self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
            stats["failed"] += 1
            return None

        try:
            logger.info(
                "Processing monthly dump job",
                extra={
                    "monthly_dump_id": monthly_dump_id,
                    "user_id": user_id,
                    "month": month,
                    "queue": self.queue_name,
                },
            )

            try:
                existing_dump_query = self.dump_controller.get({"id": monthly_dump_id}, maybe_single=True)
            except Exception as lookup_exc:
                # Older supabase clients raise APIError when maybe_single finds no rows.
                # Treat any lookup failure as "not found" so we don't mis-trigger _handle_failure.
                cls_name = type(lookup_exc).__name__
                if "APIError" in cls_name or "NotFound" in cls_name:
                    logger.warning(
                        "dump_controller.get raised lookup error, treating as not found",
                        extra={"monthly_dump_id": monthly_dump_id, "error": str(lookup_exc)},
                    )
                    existing_dump_query = None
                else:
                    raise
            existing_dump = existing_dump_query.data if existing_dump_query else None

            if existing_dump and existing_dump.get("status") == "completed":
                logger.info(
                    "Monthly dump already completed, skipping processing",
                    extra={"monthly_dump_id": monthly_dump_id, "queue": self.queue_name},
                )
                return user_id

            persisted_seed = existing_dump.get("random_seed") if existing_dump else None
            if persisted_seed is not None:
                seed = persisted_seed
            elif seed is None:
                seed = random.randint(1, 2_000_000_000)

            # Fetch entries to check if we can skip
            start_utc, end_utc = self.dump_service.get_month_bounds(month, timezone_name)
            entries = self.dump_service.fetch_entries(
                user_id=user_id,
                start_utc=start_utc,
                end_utc=end_utc
            )

            if not entries:
                logger.info(
                    "No entries found for month, skipping monthly dump",
                    extra={
                        "monthly_dump_id": monthly_dump_id,
                        "user_id": user_id,
                        "month": month,
                    },
                )
                self.dump_controller.delete({"id": monthly_dump_id})
                self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
                stats["failed"] += 1
                return None

            # Ensure msg_data has the seed in case it goes to DLQ
            msg_data["random_seed"] = seed

            self.dump_controller.update_status(
                monthly_dump_id,
                "processing",
                {
                    "random_seed": seed,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )

            result = self.dump_service.build_monthly_dump(
                MonthlyDumpInputs(
                    user_id=user_id,
                    month=month,
                    timezone=timezone_name,
                    random_seed=int(seed),
                    entries=entries,
                )
            )

            self.dump_controller.update_status(
                monthly_dump_id,
                "completed",
                {
                    "slides": result.slides,
                    "photo_count": result.photo_count,
                    "video_count": result.video_count,
                    "audio_count": result.audio_count,
                    "grid_count": result.grid_count,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "error": None,
                }
            )

            return user_id
        except Exception as exc:  # noqa: BLE001
            msg_data["last_error"] = str(exc)
            logger.exception(
                "Monthly dump processing failed",
                extra={
                    "monthly_dump_id": monthly_dump_id,
                    "user_id": user_id,
                    "month": month,
                    "error": str(exc),
                },
            )
            self._handle_failure(msg_id, msg_data, failure_count, stats)
            return None

    def _handle_failure(
        self,
        msg_id: int,
        msg_data: Dict[str, Any],
        failure_count: int,
        stats: Dict[str, int],
    ) -> None:
        new_failure_count = failure_count + 1
        msg_data["failure_count"] = new_failure_count
        monthly_dump_id = msg_data.get("monthly_dump_id")

        # Determine target queue and desired status
        if new_failure_count <= self.dlq_limit:
            target_queue = self.dlq_name
            target_stat = "moved_to_dlq"
            target_status = "pending"
        else:
            target_queue = self.dead_queue_name
            target_stat = "moved_to_dead"
            target_status = "failed"

        # Bounded retry for enqueuing to DLQ/Dead queue
        max_retries = 3
        enqueue_success = False
        for attempt in range(max_retries):
            response = self.queue_service.send_message(
                queue_name=target_queue,
                message=msg_data,
            )
            if self.queue_service.is_enqueue_response_valid(response):
                enqueue_success = True
                break

            logger.warning(
                "Failed to enqueue to target queue",
                extra={"target_queue": target_queue, "attempt": attempt + 1, "max_retries": max_retries, "msg_id": msg_id, "monthly_dump_id": monthly_dump_id},
            )

        if enqueue_success:
            # Successfully moved to DLQ/Dead
            self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
            stats[target_stat] += 1
            if monthly_dump_id:
                self.dump_controller.update_status(
                    monthly_dump_id,
                    target_status,
                    {
                        "error": msg_data.get("last_error"),
                        "random_seed": msg_data.get("random_seed"),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        else:
            # Final failure: remove from main queue to prevent infinite loop
            logger.error(
                "CRITICAL: Failed to move message to target queue after max retries. Deleting from main queue.",
                extra={"target_queue": target_queue, "max_retries": max_retries, "msg_id": msg_id, "monthly_dump_id": monthly_dump_id},
            )
            self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
            stats["failed"] += 1
            if monthly_dump_id:
                self.dump_controller.update_status(
                    monthly_dump_id,
                    "failed",
                    {
                        "error": f"Queue move failed: {msg_data.get('last_error')}",
                        "random_seed": msg_data.get("random_seed"),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
