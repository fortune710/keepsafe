from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.ingestion_service import IngestionService
from services.notification_enqueue_service import NotificationEnqueueService
from services.friend_service import FriendService
from services.supabase_client import get_supabase_client
import logging
import hmac
import hashlib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

ingestion_service = IngestionService()
notification_enqueue_service = NotificationEnqueueService()
friend_service = FriendService()

class EntryWebhookPayload(BaseModel):
    """Payload structure for entry webhook."""
    type: str  # 'INSERT', 'UPDATE', 'DELETE'
    table: str
    record: Optional[Dict[str, Any]] = None
    old_record: Optional[Dict[str, Any]] = None

class FriendWebhookPayload(BaseModel):
    """Payload structure for friend webhook."""
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
    
    Validates the incoming payload and handles INSERT, UPDATE, and DELETE events for entries. On INSERT, both ingestion and notification enqueue are performed independently - if one fails, the other still executes. Failures are logged but do not cause the webhook to fail. Returns an "ignored" response for payloads targeting other tables. Raises HTTPException for invalid payloads, unsupported webhook types, or UPDATE/DELETE failures.
    
    Parameters:
        payload (EntryWebhookPayload): Webhook payload describing the change.
        request (Request): The incoming HTTP request object.
        x_supabase_signature (Optional[str]): Optional Supabase webhook signature header (used if signature verification is implemented).
    
    Returns:
        dict: Response object containing `status`, `message`, and, when applicable, `entry_id`, `ingestion`, and `notification` status fields.
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
            
            ingestion_success = False
            notification_success = False
            
            # Ingest entry into vector database
            try:
                ingestion_success = await ingestion_service.ingest_entry(payload.record)
                if not ingestion_success:
                    logger.error(f"Failed to ingest entry {entry_id}")
            except Exception as e:
                # Log error but don't fail the webhook if ingestion fails
                logger.error(f"Error ingesting entry {entry_id}: {str(e)}", exc_info=True)
            
            # Enqueue notification for shared entry
            try:
                await notification_enqueue_service.enqueue_entry_notification(payload.record)
                notification_success = True
            except Exception as e:
                # Log error but don't fail the webhook if notification fails
                logger.error(f"Failed to enqueue entry notification: {str(e)}", exc_info=True)
            
            # Determine response status based on what succeeded
            if ingestion_success and notification_success:
                return {
                    "status": "success",
                    "message": f"Entry {entry_id} processed successfully",
                    "entry_id": entry_id,
                    "ingestion": "success",
                    "notification": "success"
                }
            elif ingestion_success:
                return {
                    "status": "partial_success",
                    "message": f"Entry {entry_id} ingested successfully, but notification enqueue failed",
                    "entry_id": entry_id,
                    "ingestion": "success",
                    "notification": "failed"
                }
            elif notification_success:
                return {
                    "status": "partial_success",
                    "message": f"Entry {entry_id} notification enqueued successfully, but ingestion failed",
                    "entry_id": entry_id,
                    "ingestion": "failed",
                    "notification": "success"
                }
            else:
                return {
                    "status": "partial_failure",
                    "message": f"Both ingestion and notification failed for entry {entry_id}",
                    "entry_id": entry_id,
                    "ingestion": "failed",
                    "notification": "failed"
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


@router.post("/friends")
async def friend_webhook(
    payload: FriendWebhookPayload,
    request: Request,
    x_supabase_signature: Optional[str] = Header(None, alias="x-supabase-signature")
):
    """
    Process friendship change webhooks for the "friendships" table.
    
    Handles INSERT events (new friend requests) and UPDATE events (friend request acceptance).
    On INSERT with status="pending", sends a friend request notification to the recipient.
    On UPDATE from "pending" to "accepted", sends an acceptance notification to the original requester.
    
    Parameters:
        payload (FriendWebhookPayload): Webhook payload describing the change.
        request (Request): The incoming HTTP request object.
        x_supabase_signature (Optional[str]): Optional Supabase webhook signature header.
    
    Returns:
        dict: Response object containing `status`, `message`, and `friendship_id`.
    """
    try:
        if payload.table != "friendships":
            logger.warning(f"Received webhook for unexpected table: {payload.table}")
            return {"status": "ignored", "message": f"Table {payload.table} not handled"}
        
        friendship_id = None
        
        if payload.type == "INSERT":
            if not payload.record:
                raise HTTPException(status_code=400, detail="Record missing in INSERT payload")
            
            friendship_id = payload.record.get("id")
            status = payload.record.get("status", "pending")
            logger.info(f"Processing INSERT webhook for friendship {friendship_id} with status {status}")
            
            # Send friend request notification if status is pending
            if status == "pending":
                success = await friend_service.send_friend_request_notification(payload.record)
                if success:
                    return {
                        "status": "success",
                        "message": f"Friend request notification sent for friendship {friendship_id}",
                        "friendship_id": friendship_id
                    }
                else:
                    logger.warning(f"Failed to send friend request notification for friendship {friendship_id}")
                    return {
                        "status": "partial_success",
                        "message": f"Friendship {friendship_id} processed but notification failed",
                        "friendship_id": friendship_id
                    }
            else:
                # Not a pending request, just acknowledge
                return {
                    "status": "success",
                    "message": f"Friendship {friendship_id} inserted (status: {status})",
                    "friendship_id": friendship_id
                }
        
        elif payload.type == "UPDATE":
            if not payload.record:
                raise HTTPException(status_code=400, detail="Record missing in UPDATE payload")
            
            friendship_id = payload.record.get("id")
            new_status = payload.record.get("status", "")
            old_status = payload.old_record.get("status", "") if payload.old_record else ""
            
            logger.info(
                f"Processing UPDATE webhook for friendship {friendship_id}: "
                f"{old_status} -> {new_status}"
            )
            
            # Send acceptance notification if status changed from pending to accepted
            if old_status == "pending" and new_status == "accepted":
                success = await friend_service.send_request_accept_notification(payload.record)
                if success:
                    return {
                        "status": "success",
                        "message": f"Friend accept notification sent for friendship {friendship_id}",
                        "friendship_id": friendship_id
                    }
                else:
                    logger.warning(f"Failed to send friend accept notification for friendship {friendship_id}")
                    return {
                        "status": "partial_success",
                        "message": f"Friendship {friendship_id} updated but notification failed",
                        "friendship_id": friendship_id
                    }
            else:
                # Status change that doesn't require notification
                return {
                    "status": "success",
                    "message": f"Friendship {friendship_id} updated (status: {old_status} -> {new_status})",
                    "friendship_id": friendship_id
                }
        
        elif payload.type == "DELETE":
            if not payload.old_record:
                raise HTTPException(status_code=400, detail="Old record missing in DELETE payload")
            
            friendship_id = payload.old_record.get("id")
            logger.info(f"Processing DELETE webhook for friendship {friendship_id}")
            
            # No notification needed for deletion
            return {
                "status": "success",
                "message": f"Friendship {friendship_id} deleted",
                "friendship_id": friendship_id
            }
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported webhook type: {payload.type}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing friend webhook: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for webhooks."""
    return {"status": "healthy", "service": "webhooks"}
