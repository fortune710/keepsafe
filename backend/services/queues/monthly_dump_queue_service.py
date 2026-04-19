from __future__ import annotations

from typing import Any, Dict, Optional
import json
import random
from datetime import datetime, timezone

from services.queue_service import QueueService
from services.supabase_client import get_supabase_client
from services.monthly_dump_service import MonthlyDumpService, MonthlyDumpInputs
from controllers.monthly_dump_controller import MonthlyDumpController
from database.tables import DatabaseTables
from queue_constants import (
    MONTHLY_DUMP_QUEUE_NAME,
    MONTHLY_DUMP_DLQ_NAME,
    MONTHLY_DUMP_DEAD_QUEUE_NAME,
    MONTHLY_DUMP_BATCH_SIZE,
    MONTHLY_DUMP_DLQ_LIMIT,
)
from utils.logging import Logger

logger = Logger("MonthlyDumpQueueService")


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
            {
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
                {"monthly_dump_id": monthly_dump_id, "queue": self.queue_name},
            )
            return False

        logger.info(
            "Monthly dump enqueued",
            {"monthly_dump_id": monthly_dump_id, "user_id": user_id, "month": month},
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
            logger.info("No monthly dump messages available", {"queue": self.queue_name})
            return stats

        for message in messages:
            await self._process_message(message, stats)

        logger.info(
            "Monthly dump queue processing complete",
            {"queue": self.queue_name, "stats": stats},
        )
        return stats

    async def _process_message(self, message: Dict[str, Any], stats: Dict[str, int]) -> None:
        stats["processed"] += 1
        msg_id = message.get("msg_id")
        msg_str = message.get("message", "{}")
        msg_data = json.loads(msg_str) if isinstance(msg_str, str) else msg_str

        monthly_dump_id = msg_data.get("monthly_dump_id")
        user_id = msg_data.get("user_id")
        month = msg_data.get("month")
        timezone_name = msg_data.get("timezone") or "UTC"
        seed = msg_data.get("random_seed")
        failure_count = msg_data.get("failure_count", 0)

        if not monthly_dump_id or not user_id or not month:
            logger.warning(
                "Invalid monthly dump message",
                {"msg_id": msg_id, "queue": self.queue_name},
            )
            self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
            stats["failed"] += 1
            return

        try:
            logger.info(
                "Processing monthly dump job",
                {
                    "monthly_dump_id": monthly_dump_id,
                    "user_id": user_id,
                    "month": month,
                    "queue": self.queue_name,
                },
            )

            if seed is None:
                seed = random.randint(1, 2_000_000_000)

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

            self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
            stats["succeeded"] += 1
        except Exception as exc:  # noqa: BLE001
            msg_data["last_error"] = str(exc)
            logger.logger.exception(
                "Monthly dump processing failed",
                extra={
                    "monthly_dump_id": monthly_dump_id,
                    "user_id": user_id,
                    "month": month,
                    "error": str(exc),
                },
            )
            self._handle_failure(msg_id, msg_data, failure_count, stats)

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
        if new_failure_count <= self.dlq_limit:
            response = self.queue_service.send_message(
                queue_name=self.dlq_name,
                message=msg_data,
            )
            if self.queue_service.is_enqueue_response_valid(response):
                self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
                stats["moved_to_dlq"] += 1
                if monthly_dump_id:
                    self.dump_controller.update_status(
                        monthly_dump_id,
                        "pending",
                        {
                            "error": msg_data.get("last_error"),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
            else:
                stats["failed"] += 1
        else:
            response = self.queue_service.send_message(
                queue_name=self.dead_queue_name,
                message=msg_data,
            )
            if self.queue_service.is_enqueue_response_valid(response):
                self.queue_service.delete_message(queue_name=self.queue_name, message_id=msg_id)
                stats["moved_to_dead"] += 1
                if monthly_dump_id:
                    self.dump_controller.update_status(
                        monthly_dump_id,
                        "failed",
                        {
                            "error": msg_data.get("last_error"),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
            else:
                stats["failed"] += 1

        stats["failed"] += 1
