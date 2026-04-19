import asyncio
import sys
import os
import json
from datetime import datetime, timezone

# Add the parent directory to sys.path so we can import modules from 'backend'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.supabase_client import get_supabase_client
from services.queue_service import QueueService
from services.queues.entry_ingestion_queue_service import EntryIngestionQueueService
from services.queues.monthly_dump_queue_service import MonthlyDumpQueueService, MonthlyDumpInputs
from services.notification_service import NotificationService
from queue_constants import (
    ENTRY_INGESTION_QUEUE_NAME,
    MONTHLY_DUMP_QUEUE_NAME,
    NOTIFICATION_QUEUE_NAME,
)

async def main():
    if len(sys.argv) < 2:
        print("Usage: python run_worker.py <ingestion|dump|notification>")
        return

    worker_type = sys.argv[1].lower()
    supabase = get_supabase_client()
    queue_service = QueueService()
    queue_service.supabase = supabase

    # Map worker type to queue name
    queue_map = {
        "ingestion": ENTRY_INGESTION_QUEUE_NAME,
        "dump": MONTHLY_DUMP_QUEUE_NAME,
        "notification": NOTIFICATION_QUEUE_NAME
    }

    if worker_type not in queue_map:
        print(f"Error: Unknown worker type '{worker_type}'")
        return

    queue_name = queue_map[worker_type]
    print(f"--- Checking Queue: {queue_name} ---")

    # Read exactly one message
    messages = queue_service.read_messages(queue_name=queue_name, batch_size=1, visibility_timeout_seconds=10)
    
    if not messages:
        print("No messages found in queue.")
        return

    msg = messages[0]
    msg_id = msg.get("msg_id")
    payload = msg.get("message")
    
    if isinstance(payload, str):
        payload = json.loads(payload)

    print(f"DEBUG: Found Message ID {msg_id}")
    print(f"DEBUG: Payload: {json.dumps(payload, indent=2)}")
    print("-" * 40)

    try:
        if worker_type == "ingestion":
            from services.ingestion_service import IngestionService
            ingestion_service = IngestionService()
            entry_id = payload.get("entry_id")
            
            # Fetch entry from DB
            entry_res = supabase.table("entries").select("*").eq("id", entry_id).maybe_single().execute()
            entry = entry_res.data
            
            if not entry:
                print(f"Warning: Entry {entry_id} not found in DB. Deleting orphaned message.")
                queue_service.delete_message(queue_name=queue_name, message_id=msg_id)
                return

            print(f"Processing Ingestion for Entry: {entry_id}...")
            success = await ingestion_service.ingest_entry(entry)
            
            if success:
                print("Ingestion Succeeded!")
                supabase.table("entries").update({"is_enqueued": False}).eq("id", entry_id).execute()
                queue_service.delete_message(queue_name=queue_name, message_id=msg_id)
            else:
                raise Exception("Ingestion service returned False")

        elif worker_type == "dump":
            from services.monthly_dump_service import MonthlyDumpService
            dump_service = MonthlyDumpService()
            
            m_id = payload.get("monthly_dump_id")
            u_id = payload.get("user_id")
            month = payload.get("month")
            tz = payload.get("timezone", "UTC")
            seed = payload.get("random_seed", 0)

            print(f"Processing Monthly Dump {m_id} for User {u_id}...")
            
            # Perform core logic
            result = dump_service.build_monthly_dump(
                MonthlyDumpInputs(user_id=u_id, month=month, timezone=tz, random_seed=int(seed))
            )

            # Update DB
            supabase.table("monthly_dumps").update({
                "status": "completed",
                "slides": result.slides,
                "photo_count": result.photo_count,
                "video_count": result.video_count,
                "audio_count": result.audio_count,
                "grid_count": result.grid_count,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", m_id).execute()

            print("Monthly Dump Succeeded!")
            queue_service.delete_message(queue_name=queue_name, message_id=msg_id)

        elif worker_type == "notification":
            notif_service = NotificationService()
            print("Processing Notification...")
            
            success = await notif_service._send_notification(
                title=payload.get("title"),
                body=payload.get("body"),
                recipients=payload.get("recipients", []),
                priority=payload.get("priority", "default"),
                data=payload.get("data", {})
            )

            if success:
                print("Notification Succeeded!")
                queue_service.delete_message(queue_name=queue_name, message_id=msg_id)
            else:
                raise Exception("Notification send returned False")

    except Exception as e:
        print("\n" + "!" * 20 + " ERROR DETECTED " + "!" * 20)
        import traceback
        traceback.print_exc()
        print("!" * 56)
        print("\nKEEPING MESSAGE IN QUEUE for fixing. You can run this script again after fixing the code.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
