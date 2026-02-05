from typing import Dict, Any, List, Optional
import asyncio
import logging
import time
import random
from datetime import datetime, timezone

from exponent_server_sdk import PushClient, PushMessage, PushServerError, DeviceNotRegisteredError
from posthog import Posthog
import json
import httpx

from services.supabase_client import get_supabase_client
from config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for processing push notifications using Supabase Queues and Expo SDK."""
    
    def __init__(self):
        """Initialize the notification service with clients and configuration."""
        self.supabase = get_supabase_client()
        self.expo_client = PushClient()
        self.queue_name = settings.NOTIFICATION_QUEUE_NAME
        self.dlq_name = settings.NOTIFICATION_DLQ_NAME
        self.concurrency = settings.NOTIFICATION_CONCURRENCY
        self.batch_size = settings.NOTIFICATION_BATCH_SIZE
        self.dlq_limit = settings.NOTIFICATION_DLQ_LIMIT
        
        # Initialize PostHog
        if settings.POSTHOG_API_KEY:
            self.posthog_client = Posthog(
                project_api_key=settings.POSTHOG_API_KEY,
                host=settings.POSTHOG_HOST
            )
            logger.info("PostHog initialized for error monitoring")
        else:
            self.posthog_client = None
            logger.warning("PostHog API key not set, error monitoring disabled")
        
        # Semaphore for concurrency control
        self.semaphore = asyncio.Semaphore(self.concurrency)
        
        logger.info(
            f"NotificationService initialized: queue={self.queue_name}, "
            f"dlq={self.dlq_name}, concurrency={self.concurrency}, "
            f"batch_size={self.batch_size}, dlq_limit={self.dlq_limit}"
        )
    
    def enqueue_notification(
        self,
        title: str,
        body: str,
        recipients: List[str],
        priority: str = "default",
        metadata: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Enqueue a notification to the queue.
        
        Args:
            title: Notification title
            body: Notification body text
            recipients: List of Expo push tokens
            priority: Priority level ("default", "normal", "high")
            metadata: Optional additional metadata for tracking
            data: Optional data dictionary to be sent with the push notification
        
        Returns:
            True if successfully enqueued, False otherwise
        """
        try:
            if not title or not body or not recipients:
                logger.error("Missing required fields: title, body, or recipients")
                return False
            
            if priority not in ["default", "normal", "high"]:
                logger.warning(f"Invalid priority '{priority}', defaulting to 'default'")
                priority = "default"
            
            message = {
                "title": title,
                "body": body,
                "recipients": recipients,
                "priority": priority,
                "failure_count": 0,
                "metadata": metadata or {},
                "data": data or {},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Send to queue using pgmq_public.send
            # Message needs to be JSON stringified
            self.supabase.schema("pgmq_public").rpc(
                "send",
                {
                    "queue_name": self.queue_name,
                    "message": json.dumps(message)
                }
            ).execute()
            
            logger.info(
                f"Notification enqueued: title='{title}', "
                f"recipients={len(recipients)}, priority={priority}"
            )
            
            # Capture PostHog event for notification enqueued
            self._capture_notification_enqueued_event(
                metadata=metadata,
                recipients=recipients,
                title=title,
                body=body,
                priority=priority
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error enqueueing notification: {str(e)}", exc_info=True)
            self._log_error_to_posthog(
                error=e,
                context={
                    "operation": "enqueue_notification",
                    "title": title,
                    "recipients_count": len(recipients) if recipients else 0,
                    "priority": priority
                }
            )
            return False
    
    async def process_queue(self) -> Dict[str, int]:
        """
        Process up to the configured batch of messages from the notification queue and aggregate processing statistics.
        
        Returns:
            stats (Dict[str, int]): Dictionary with processing counts:
                - "processed": total messages attempted,
                - "succeeded": notifications successfully sent,
                - "failed": notifications that failed and were handled (including moved/discarded),
                - "moved_to_dlq": messages moved to the dead-letter queue for retry,
                - "discarded": messages removed after exceeding the DLQ retry limit.
        """
        stats = {
            "processed": 0,
            "succeeded": 0,
            "failed": 0,
            "moved_to_dlq": 0,
            "discarded": 0
        }
        
        try:
            logger.info(f"Starting queue processing: batch_size={self.batch_size}")
            
            # Read messages from queue (pgmq_public.read with visibility timeout)
            # Read up to batch_size messages
            response = self.supabase.schema("pgmq_public").rpc(
                "read",
                {
                    "queue_name": self.queue_name,
                    "sleep_seconds": 300,  # Visibility timeout: 5 minutes
                    "n": self.batch_size
                }
            ).execute()
            
            messages = response.data if response.data else []
            
            if not messages:
                logger.info("No messages in queue to process")
                return stats
            
            logger.info(f"Retrieved {len(messages)} messages from queue")
            
            # Process messages concurrently
            tasks = [self._process_message(msg, stats) for msg in messages]
            await asyncio.gather(*tasks)
            
            logger.info(
                f"Queue processing completed: processed={stats['processed']}, "
                f"succeeded={stats['succeeded']}, failed={stats['failed']}, "
                f"moved_to_dlq={stats['moved_to_dlq']}, discarded={stats['discarded']}"
            )
            
        except Exception as e:
            logger.error(f"Error processing queue: {str(e)}", exc_info=True)
            self._log_error_to_posthog(
                error=e,
                context={"operation": "process_queue"}
            )
        
        return stats
    
    async def _process_message(self, message: Dict[str, Any], stats: Dict[str, int]) -> None:
        """
        Process a single notification queue message: attempts delivery, updates stats, and handles success or failure.
        
        On success the message is deleted and stats["succeeded"] is incremented. On failure the message's failure count is incremented and the message is either moved to the dead-letter queue or discarded based on the service configuration; stats["failed"] is incremented accordingly. This function also increments stats["processed"] and logs/report errors to PostHog when configured.
        
        Args:
            message: Queue message containing "msg_id", optional "read_ct", and "message" (either a dict or a JSON string) with keys "title", "body", "recipients", and optional "priority", "failure_count", "metadata", "data".
            stats: Mutable dictionary of counters updated in-place (expected keys include "processed", "succeeded", "failed", "moved_to_dlq", "discarded").
        """
        msg_id = message.get("msg_id")
        read_ct = message.get("read_ct", 0)
        # Message might be a JSON string or dict
        msg_str = message.get("message", "{}")
        if isinstance(msg_str, str):
            msg_data = json.loads(msg_str)
        else:
            msg_data = msg_str
        
        stats["processed"] += 1
        
        try:
            # Extract message data
            title = msg_data.get("title")
            body = msg_data.get("body")
            recipients = msg_data.get("recipients", [])
            priority = msg_data.get("priority", "default")
            failure_count = msg_data.get("failure_count", 0)
            metadata = msg_data.get("metadata", {})
            data = msg_data.get("data", {})
            
            if not title or not body or not recipients:
                logger.warning(f"Invalid message format: msg_id={msg_id}")
                # Delete invalid message
                await self._delete_message(msg_id)
                stats["failed"] += 1
                return
            
            # Send notification with retry and backoff
            success = await self._send_notification(
                title=title,
                body=body,
                recipients=recipients,
                priority=priority,
                data=data,
                retry_count=0
            )
            
            if success:
                # Delete message from queue on success
                await self._delete_message(msg_id)
                stats["succeeded"] += 1
                logger.info(f"Successfully processed notification: msg_id={msg_id}")
                
                # Capture PostHog event for notification sent
                self._capture_notification_sent_event(
                    metadata=metadata,
                    recipients=recipients,
                    title=title,
                    body=body,
                    priority=priority
                )
            else:
                # Handle failure
                await self._handle_failure(
                    msg_id=msg_id,
                    message_data=msg_data,
                    failure_count=failure_count,
                    stats=stats
                )
                
        except Exception as e:
            logger.error(f"Error processing message {msg_id}: {str(e)}", exc_info=True)
            self._log_error_to_posthog(
                error=e,
                context={
                    "operation": "_process_message",
                    "msg_id": msg_id,
                    "message_data": msg_data
                }
            )
            stats["failed"] += 1
    
    async def _send_notification(
        self,
        title: str,
        body: str,
        recipients: List[str],
        priority: str,
        data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0,
        max_retries: int = 3,
        use_rest_api: bool = True
    ) -> bool:
        """
        Send a push notification to the given Expo recipients, retrying on rate-limit errors with exponential backoff.
        
        Parameters:
            title (str): Notification title shown to recipients.
            body (str): Notification body text.
            recipients (List[str]): Expo push tokens to receive the notification.
            priority (str): Delivery priority for the notification.
            data (Optional[Dict[str, Any]]): Optional payload delivered with the notification.
            retry_count (int): Current retry attempt (starts at 0).
            max_retries (int): Maximum number of retry attempts for rate-limit errors.
            use_rest_api (bool): If True, use REST API; if False, use Expo Server SDK. Defaults to True.
        
        Returns:
            bool: `True` if the notification was accepted/sent, `False` otherwise.
        """
        async with self.semaphore:
            if use_rest_api:
                return await self._send_notification_via_rest_api(
                    title=title,
                    body=body,
                    recipients=recipients,
                    priority=priority,
                    data=data,
                    retry_count=retry_count,
                    max_retries=max_retries
                )
            else:
                return await self._send_notification_via_sdk(
                    title=title,
                    body=body,
                    recipients=recipients,
                    priority=priority,
                    data=data,
                    retry_count=retry_count,
                    max_retries=max_retries
                )
    
    async def _send_notification_via_rest_api(
        self,
        title: str,
        body: str,
        recipients: List[str],
        priority: str,
        data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0,
        max_retries: int = 3
    ) -> bool:
        """
        Send a push notification via Expo REST API with retry and backoff for rate limits.
        
        Parameters:
            title (str): Notification title shown to recipients.
            body (str): Notification body text.
            recipients (List[str]): Expo push tokens to receive the notification.
            priority (str): Delivery priority for the notification.
            data (Optional[Dict[str, Any]]): Optional payload delivered with the notification.
            retry_count (int): Current retry attempt (starts at 0).
            max_retries (int): Maximum number of retry attempts for rate-limit errors.
        
        Returns:
            bool: `True` if the notification was accepted/sent, `False` otherwise.
        """
        # Expo REST API endpoint
        api_url = "https://exp.host/--/api/v2/push/send"
        
        # Prepare messages array for Expo API
        messages = []
        for recipient in recipients:
            message = {
                "to": recipient,
                "title": title,
                "body": body,
                "priority": priority,
            }
            if data:
                message["data"] = data
            messages.append(message)
        
        # Headers for Expo API
        headers = {
            "Accept": "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    api_url,
                    json=messages,
                    headers=headers
                )
                response.raise_for_status()
                
                result = response.json()
                
                # Expo API returns an array of ticket objects
                # Each ticket has a "status" field: "ok" or "error"
                if isinstance(result, dict) and "data" in result:
                    tickets = result["data"]
                elif isinstance(result, list):
                    tickets = result
                else:
                    tickets = [result]
                
                # Check if all tickets are successful
                all_success = all(
                    ticket.get("status") == "ok" 
                    for ticket in tickets 
                    if isinstance(ticket, dict)
                )
                
                if all_success:
                    logger.info(
                        f"Notification sent successfully via REST API: recipients={len(recipients)}, "
                        f"priority={priority}"
                    )
                    return True
                else:
                    # Some tickets failed
                    error_tickets = [
                        ticket for ticket in tickets 
                        if isinstance(ticket, dict) and ticket.get("status") != "ok"
                    ]
                    error_msg = f"Some notifications failed: {error_tickets}"
                    logger.warning(f"Expo REST API error: {error_msg}")
                    return False
                
        except httpx.HTTPStatusError as e:
            # Handle HTTP errors (like 429 rate limit)
            error_msg = str(e)
            is_rate_limit = e.response.status_code == 429
            
            logger.warning(
                f"Expo REST API error (retry {retry_count}/{max_retries}): {error_msg}"
            )
            
            if retry_count < max_retries and is_rate_limit:
                # Apply exponential backoff for rate limits
                delay = min(2 ** retry_count + random.uniform(0, 1), 60)
                logger.info(f"Rate limit hit (HTTP 429), waiting {delay:.2f} seconds before retry")
                await asyncio.sleep(delay)
                return await self._send_notification_via_rest_api(
                    title=title,
                    body=body,
                    recipients=recipients,
                    priority=priority,
                    data=data,
                    retry_count=retry_count + 1,
                    max_retries=max_retries
                )
            
            # Non-rate-limit errors or max retries reached
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending notification via REST API: {str(e)}", exc_info=True)
            return False
    
    async def _send_notification_via_sdk(
        self,
        title: str,
        body: str,
        recipients: List[str],
        priority: str,
        data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0,
        max_retries: int = 3
    ) -> bool:
        """
        Send a push notification via Expo Server SDK with retry and backoff for rate limits.
        
        Parameters:
            title (str): Notification title shown to recipients.
            body (str): Notification body text.
            recipients (List[str]): Expo push tokens to receive the notification.
            priority (str): Delivery priority for the notification.
            data (Optional[Dict[str, Any]]): Optional payload delivered with the notification.
            retry_count (int): Current retry attempt (starts at 0).
            max_retries (int): Maximum number of retry attempts for rate-limit errors.
        
        Returns:
            bool: `True` if the notification was accepted/sent, `False` otherwise.
        """
        try:
            # Create push message
            push_message = PushMessage(
                to=recipients,
                title=title,
                body=body,
                priority=priority,
                data=data or {}
            )
            
            # Send via Expo SDK
            response = self.expo_client.publish(push_message)
            response.validate_response()
            
            logger.info(
                f"Notification sent successfully via SDK: recipients={len(recipients)}, "
                f"priority={priority}"
            )
            return True
            
        except (PushServerError, DeviceNotRegisteredError) as e:
            # Handle Expo-specific errors
            error_msg = str(e)
            logger.warning(
                f"Expo SDK error (retry {retry_count}/{max_retries}): {error_msg}"
            )
            
            # Check if it's a rate limit error (HTTP 429)
            is_rate_limit = "429" in error_msg or "rate limit" in error_msg.lower()
            
            if retry_count < max_retries and is_rate_limit:
                # Apply exponential backoff for rate limits
                delay = min(2 ** retry_count + random.uniform(0, 1), 60)
                logger.info(f"Rate limit hit, waiting {delay:.2f} seconds before retry")
                await asyncio.sleep(delay)
                return await self._send_notification_via_sdk(
                    title=title,
                    body=body,
                    recipients=recipients,
                    priority=priority,
                    data=data,
                    retry_count=retry_count + 1,
                    max_retries=max_retries
                )
            
            # Non-rate-limit errors or max retries reached
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending notification via SDK: {str(e)}", exc_info=True)
            return False
    
    async def _handle_failure(
        self,
        msg_id: int,
        message_data: Dict[str, Any],
        failure_count: int,
        stats: Dict[str, int]
    ) -> None:
        """
        Handle a failed notification message.
        
        Args:
            msg_id: Message ID from queue
            message_data: Original message data
            failure_count: Current failure count
            stats: Statistics dictionary to update
        """
        new_failure_count = failure_count + 1
        message_data["failure_count"] = new_failure_count
        
        # Check if we should move to DLQ or discard
        if new_failure_count <= self.dlq_limit:
            # Move to DLQ
            try:
                # Delete from main queue
                await self._delete_message(msg_id)
                
                # Send to DLQ
                self.supabase.schema("pgmq_public").rpc(
                    "send",
                    {
                        "queue_name": self.dlq_name,
                        "message": json.dumps(message_data)
                    }
                ).execute()
                
                stats["moved_to_dlq"] += 1
                logger.info(
                    f"Message moved to DLQ: msg_id={msg_id}, "
                    f"failure_count={new_failure_count}"
                )
                
            except Exception as e:
                logger.error(f"Error moving message to DLQ: {str(e)}", exc_info=True)
                self._log_error_to_posthog(
                    error=e,
                    context={
                        "operation": "_handle_failure",
                        "msg_id": msg_id,
                        "message_data": message_data
                    }
                )
        else:
            # Discard message (exceeded DLQ limit)
            try:
                await self._delete_message(msg_id)
                stats["discarded"] += 1
                
                logger.warning(
                    f"Message discarded (exceeded DLQ limit): msg_id={msg_id}, "
                    f"failure_count={new_failure_count}"
                )
                
                # Log to PostHog with full context
                self._log_error_to_posthog(
                    error=Exception(f"Notification failed {new_failure_count} times and exceeded DLQ limit"),
                    context={
                        "operation": "_handle_failure",
                        "msg_id": msg_id,
                        "message_data": message_data,
                        "failure_count": new_failure_count,
                        "action": "discarded"
                    }
                )
                
            except Exception as e:
                logger.error(f"Error discarding message: {str(e)}", exc_info=True)
                self._log_error_to_posthog(
                    error=e,
                    context={
                        "operation": "_handle_failure",
                        "msg_id": msg_id,
                        "message_data": message_data
                    }
                )
        
        stats["failed"] += 1
    
    async def _delete_message(self, msg_id: int) -> None:
        """
        Delete a message from the configured queue by its message ID.
        
        Parameters:
            msg_id (int): The queue message identifier to remove.
        
        Raises:
            Exception: Propagates any exception raised while calling the Supabase delete RPC.
        """
        try:
            self.supabase.schema("pgmq_public").rpc(
                "delete",
                {
                    "queue_name": self.queue_name,
                    "message_id": msg_id
                }
            ).execute()
        except Exception as e:
            logger.error(f"Error deleting message {msg_id}: {str(e)}", exc_info=True)
            raise
    
    def _get_user_info_from_tokens(self, tokens: List[str]) -> Dict[str, Dict[str, Optional[str]]]:
        """
        Get user_id and email for each push token.
        
        Args:
            tokens: List of Expo push tokens
            
        Returns:
            Dict mapping token to user info with keys: user_id, email
        """
        if not tokens or not self.posthog_client:
            return {}
        
        try:
            # Query push_tokens table to get user_ids for tokens
            response = (
                self.supabase.table("push_tokens")
                .select("token, user_id")
                .in_("token", tokens)
                .execute()
            )
            
            token_to_user: Dict[str, str] = {}
            if response.data:
                for row in response.data:
                    token = row.get("token")
                    user_id = row.get("user_id")
                    if token and user_id:
                        token_to_user[token] = user_id
            
            if not token_to_user:
                return {}
            
            # Get emails for user_ids
            user_ids = list(set(token_to_user.values()))
            profile_response = self.supabase.table("profiles").select("id, email").in_("id", user_ids).execute()
            
            user_id_to_email: Dict[str, Optional[str]] = {}
            if profile_response.data:
                for profile in profile_response.data:
                    user_id = profile.get("id")
                    email = profile.get("email")
                    if user_id:
                        user_id_to_email[user_id] = email
            
            # Build result mapping token -> {user_id, email}
            result: Dict[str, Dict[str, Optional[str]]] = {}
            for token, user_id in token_to_user.items():
                result[token] = {
                    "user_id": user_id,
                    "email": user_id_to_email.get(user_id)
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting user info from tokens: {str(e)}")
            return {}
    
    def _capture_notification_enqueued_event(
        self,
        metadata: Optional[Dict[str, Any]],
        recipients: List[str],
        title: str,
        body: str,
        priority: str
    ) -> None:
        """Capture PostHog event when notification is enqueued."""
        if not self.posthog_client:
            return
        
        try:
            notification_type = metadata.get("notification_type", "unknown") if metadata else "unknown"
            
            # Get user info from tokens
            token_user_info = self._get_user_info_from_tokens(recipients)
            
            # Capture event for each recipient
            for token in recipients:
                user_info = token_user_info.get(token, {})
                user_id = user_info.get("user_id")
                email = user_info.get("email")
                
                properties: Dict[str, Any] = {
                    "notification_type": notification_type,
                    "title": title,
                    "body": body,
                    "priority": priority,
                    "recipient_count": len(recipients),
                }
                
                if user_id:
                    properties["user_id"] = user_id
                
                # Add any additional metadata
                if metadata:
                    for key, value in metadata.items():
                        if key not in properties and key != "notification_type":
                            properties[f"metadata_{key}"] = value
                
                # Use user_id as distinct_id if available, otherwise use token
                distinct_id = user_id if user_id else f"token_{token[:8]}"
                
                self.posthog_client.capture(
                    distinct_id=distinct_id,
                    event="notification_enqueued",
                    properties=properties
                )
            
            self.posthog_client.flush()
            
        except Exception as e:
            logger.error(f"Error capturing notification_enqueued event to PostHog: {str(e)}")
    
    def _capture_notification_sent_event(
        self,
        metadata: Optional[Dict[str, Any]],
        recipients: List[str],
        title: str,
        body: str,
        priority: str
    ) -> None:
        """Capture PostHog event when notification is successfully sent."""
        if not self.posthog_client:
            return
        
        try:
            notification_type = metadata.get("notification_type", "unknown") if metadata else "unknown"
            
            # Get user info from tokens
            token_user_info = self._get_user_info_from_tokens(recipients)
            
            # Capture event for each recipient
            for token in recipients:
                user_info = token_user_info.get(token, {})
                user_id = user_info.get("user_id")
                email = user_info.get("email")
                
                properties: Dict[str, Any] = {
                    "notification_type": notification_type,
                    "title": title,
                    "body": body,
                    "priority": priority,
                    "recipient_count": len(recipients),
                }
                
                if user_id:
                    properties["user_id"] = user_id
                if email:
                    properties["email"] = email
                
                # Add any additional metadata
                if metadata:
                    for key, value in metadata.items():
                        if key not in properties and key != "notification_type":
                            properties[f"metadata_{key}"] = value
                
                # Use user_id as distinct_id if available, otherwise use token
                distinct_id = user_id if user_id else f"token_{token[:8]}"
                
                self.posthog_client.capture(
                    distinct_id=distinct_id,
                    event="notification_sent",
                    properties=properties
                )
            
            self.posthog_client.flush()
            
        except Exception as e:
            logger.error(f"Error capturing notification_sent event to PostHog: {str(e)}")
    
    def _log_error_to_posthog(self, error: Exception, context: Dict[str, Any]) -> None:
        """
        Send an error event to PostHog with contextual properties.
        
        If a PostHog client is configured, captures a "notification_error" event whose properties include
        `error_type`, `error_message`, `error_traceback` and all key/value pairs from `context`, then flushes
        events by shutting down the PostHog client. If no PostHog client is configured this is a no-op.
        Failures that occur while attempting to send the event are caught and logged locally.
        
        Parameters:
            error (Exception): The exception to report.
            context (Dict[str, Any]): Additional context to include in the event; keys and values should be
                serializable for PostHog.
        """
        if not self.posthog_client:
            return
        
        try:
            self.posthog_client.capture(
                distinct_id="notification_service",
                event="notification_error",
                properties={
                    "error_type": type(error).__name__,
                    "error_message": str(error),
                    "error_traceback": str(error.__traceback__) if hasattr(error, "__traceback__") else None,
                    **context
                }
            )
            self.posthog_client.flush()  # Flush events without stopping the client
        except Exception as e:
            logger.error(f"Error logging to PostHog: {str(e)}", exc_info=True)
    
    async def process_dlq(self) -> Dict[str, int]:
        """
        Process messages from the dead-letter queue using the standard queue processing pipeline.
        
        Temporarily targets the configured DLQ (swapping the service's queue target) and restores the original queue name after processing completes.
        
        Returns:
            stats (Dict[str, int]): Processing statistics with keys:
                - "processed": total messages attempted
                - "succeeded": messages successfully delivered
                - "failed": messages that failed delivery and were handled
                - "moved_to_dlq": messages moved into the DLQ during handling
                - "discarded": messages discarded after exceeding DLQ retry limit
        """
        # Temporarily swap queue names
        original_queue = self.queue_name
        self.queue_name = self.dlq_name
        
        try:
            stats = await self.process_queue()
        finally:
            # Restore original queue name
            self.queue_name = original_queue
        
        return stats
    
    def shutdown(self) -> None:
        """
        Shutdown the notification service and cleanup resources.
        This should be called once when the service is terminating.
        """
        if not self.posthog_client:
            return None

        try:
            self.posthog_client.flush()
            logger.info("PostHog client shut down")
        except Exception as e:
            logger.error(f"Error shutting down PostHog client: {str(e)}", exc_info=True)

