import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from services.supabase_client import get_supabase_client
from services.notification_enqueue_service import NotificationEnqueueService
from controllers.time_capsule_controller import TimeCapsuleController
from queue_constants import TIME_CAPSULE_BATCH_SIZE

logger = logging.getLogger(__name__)


class TimeCapsuleUnlockService:
    """
    Scheduler-driven logic for flipping due time capsules to `unlocked` and notifying their
    owners. Kept separate from any request-driven capsule logic (there isn't any left in
    Python - creation/listing/request-release/cancel-release are direct frontend<->Supabase
    calls), mirroring how monthly_dump_service.py's build logic is separate from its
    enqueue/queue scheduling services.
    """

    def __init__(self) -> None:
        self.supabase = get_supabase_client()
        self.controller = TimeCapsuleController(self.supabase)
        self.notification_enqueue_service = NotificationEnqueueService()

    async def process_due_capsules(self) -> Dict[str, Any]:
        run_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        try:
            due_date = (
                self.controller.fetch_due_date_unlocks(now_iso, TIME_CAPSULE_BATCH_SIZE).data
                or []
            )
            due_release = (
                self.controller.fetch_due_pending_releases(now_iso, TIME_CAPSULE_BATCH_SIZE).data
                or []
            )
            due = due_date + due_release

            if not due:
                logger.info(
                    "Time capsule unlock run found nothing due",
                    extra={"run_id": run_id},
                )
                return {"run_id": run_id, "date_unlocked": 0, "release_unlocked": 0, "notified": 0}

            capsule_ids = [capsule["id"] for capsule in due]
            self.controller.mark_unlocked(capsule_ids, now_iso)

            notified = await self.notification_enqueue_service.enqueue_time_capsule_unlocked_notifications(due)

            stats = {
                "run_id": run_id,
                "date_unlocked": len(due_date),
                "release_unlocked": len(due_release),
                "notified": notified,
            }
            logger.info("Time capsule unlock run complete", extra=stats)
            return stats
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Time capsule unlock run failed",
                extra={"run_id": run_id, "error": str(exc)},
            )
            return {"run_id": run_id, "date_unlocked": 0, "release_unlocked": 0, "notified": 0}
