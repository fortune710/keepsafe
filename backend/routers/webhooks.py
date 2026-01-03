from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.ingestion_service import IngestionService
from services.notification_enqueue_service import NotificationEnqueueService
from services.supabase_client import get_supabase_client
import logging
import hmac
import hashlib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

ingestion_service = IngestionService()
notification_enqueue_service = NotificationEnqueueService()

class EntryWebhookPayload(BaseModel):
    """Payload structure for entry webhook."""
    type: str  # 'INSERT', 'UPDATE', 'DELETE'
    table: str
    record: Optional[Dict[str, Any]] = None
    old_record: Optional[Dict[str, Any]] = None

@router.post("/entries")
async def entry_webhook(
    payload: EntryWebhookPayload,
    request: Request,
    x_supabase_signature: Optional[str] = Header(None, alias="x-supabase-signature")
):
    """
    Process entry change webhooks for the "entries" table.
    
    Validates the incoming payload and handles INSERT, UPDATE, and DELETE events for entries. On successful INSERT, an ingestion is performed and a notification is enqueued; notification failures are logged but do not cause the webhook to fail. Returns an "ignored" response for payloads targeting other tables. Raises HTTPException for invalid payloads, unsupported webhook types, or ingestion/delete/update failures.
    
    Parameters:
        payload (EntryWebhookPayload): Webhook payload describing the change.
        request (Request): The incoming HTTP request object.
        x_supabase_signature (Optional[str]): Optional Supabase webhook signature header (used if signature verification is implemented).
    
    Returns:
        dict: Response object containing `status`, `message`, and, when applicable, `entry_id`.
    """
    try:
        # Verify webhook signature if needed (optional security check)
        # You can implement signature verification here if Supabase sends it
        
        if payload.table != "entries":
            logger.warning(f"Received webhook for unexpected table: {payload.table}")
            return {"status": "ignored", "message": f"Table {payload.table} not handled"}
        
        entry_id = None
        
        if payload.type == "INSERT":
            if not payload.record:
                raise HTTPException(status_code=400, detail="Record missing in INSERT payload")
            
            entry_id = payload.record.get("id")
            logger.info(f"Processing INSERT webhook for entry {entry_id}")
            
            # Ingest entry into vector database
            success = await ingestion_service.ingest_entry(payload.record)
            
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to ingest entry {entry_id}"
                )
            
            # Enqueue notification for shared entry
            try:
                await notification_enqueue_service.enqueue_entry_notification(payload.record)
            except Exception as e:
                # Log error but don't fail the webhook if notification fails
                logger.error(f"Failed to enqueue entry notification: {str(e)}", exc_info=True)
            
            return {
                "status": "success",
                "message": f"Entry {entry_id} ingested successfully",
                "entry_id": entry_id
            }
        
        elif payload.type == "UPDATE":
            if not payload.record:
                raise HTTPException(status_code=400, detail="Record missing in UPDATE payload")
            
            entry_id = payload.record.get("id")
            logger.info(f"Processing UPDATE webhook for entry {entry_id}")
            
            success = await ingestion_service.update_entry(payload.record)
            
            if success:
                return {
                    "status": "success",
                    "message": f"Entry {entry_id} updated successfully",
                    "entry_id": entry_id
                }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to update entry {entry_id}"
                )
        
        elif payload.type == "DELETE":
            if not payload.old_record:
                raise HTTPException(status_code=400, detail="Old record missing in DELETE payload")
            
            entry_id = payload.old_record.get("id")
            logger.info(f"Processing DELETE webhook for entry {entry_id}")
            
            success = await ingestion_service.delete_entry(entry_id)
            
            if success:
                return {
                    "status": "success",
                    "message": f"Entry {entry_id} deleted successfully",
                    "entry_id": entry_id
                }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to delete entry {entry_id}"
                )
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported webhook type: {payload.type}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for webhooks."""
    return {"status": "healthy", "service": "webhooks"}
