from typing import Dict, Any, Optional
import logging
from services.notification_service import NotificationService
from services.supabase_client import get_supabase_client
from services.cache_service import CacheService

logger = logging.getLogger(__name__)


class FriendshipDict(Dict[str, Any]):
    """Type definition for friendship dictionary."""
    pass


class ProfileDict(Dict[str, Any]):
    """Type definition for profile dictionary."""
    pass


class FriendService:
    """Service for handling friend-related notifications."""
    
    def __init__(self):
        """
        Initialize FriendService.
        
        Sets up the Supabase client, a NotificationService, and a CacheService, and logs completion.
        
        Attributes:
            supabase: Supabase client used for database queries.
            notification_service: Service responsible for enqueuing notifications.
            cache_service: Cache service used for batching settings and push tokens.
        """
        self.supabase = get_supabase_client()
        self.notification_service = NotificationService()
        self.cache_service = CacheService()
        logger.info("FriendService initialized")
    
    async def send_friend_request_notification(
        self,
        friendship: FriendshipDict
    ) -> bool:
        """
        Send a push notification when a friend request is sent.
        
        When a user sends a friend request, this method notifies the recipient.
        The notification is sent to the friend_id (recipient) about the user_id (sender).
        
        Parameters:
            friendship (FriendshipDict): Dictionary representing the friendship. Expected keys:
                - id (str): Friendship ID.
                - user_id (str): User ID of the person sending the request.
                - friend_id (str): User ID of the person receiving the request.
                - status (str): Should be "pending" for a new request.
        
        Returns:
            bool: `True` if the notification was enqueued successfully, `False` otherwise.
        """
        try:
            friendship_id = friendship.get("id")
            sender_id = friendship.get("user_id")
            recipient_id = friendship.get("friend_id")
            status = friendship.get("status", "pending")
            
            if not friendship_id or not sender_id or not recipient_id:
                logger.warning(
                    f"Missing required fields for friend request notification: "
                    f"friendship_id={friendship_id}, sender_id={sender_id}, recipient_id={recipient_id}"
                )
                return False
            
            # Only send notification for pending requests
            if status != "pending":
                logger.info(f"Friendship {friendship_id} is not pending, skipping notification")
                return True
            
            # Get sender's profile information
            sender_profile = self._get_user_profile(sender_id)
            if not sender_profile:
                logger.warning(f"Could not find profile for friend request sender: {sender_id}")
                return False
            
            sender_name = sender_profile.get("username") or sender_profile.get("full_name") or "Someone"
            
            # Check if recipient has friend_requests notifications enabled
            recipient_ids = [recipient_id]
            filtered_recipients = self._filter_recipients_by_notification_settings(
                recipient_ids,
                notification_type="friend_requests"
            )
            
            if not filtered_recipients:
                logger.info(
                    f"Recipient {recipient_id} has friend_requests notifications disabled, "
                    f"skipping notification for friendship {friendship_id}"
                )
                return True  # Not an error, just user preference
            
            # Get push tokens for recipient
            push_tokens = self._get_push_tokens_for_users(filtered_recipients)
            
            if not push_tokens:
                logger.info(f"No push tokens found for recipient {recipient_id} of friendship {friendship_id}")
                return True  # Not an error, just no tokens available
            
            # Create notification message
            title = "New Friend Request"
            body = f"{sender_name} sent you a friend request"
            
            # Enqueue the notification
            success = self.notification_service.enqueue_notification(
                title=title,
                body=body,
                recipients=push_tokens,
                priority="normal",
                metadata={
                    "friendship_id": friendship_id,
                    "sender_id": sender_id,
                    "recipient_id": recipient_id,
                    "notification_type": "friend_request"
                },
                data={
                    "page_url": "/friends",
                }
            )
            
            if success:
                logger.info(
                    f"Friend request notification enqueued: friendship_id={friendship_id}, "
                    f"sender={sender_name}, recipient={recipient_id}"
                )
            else:
                logger.error(f"Failed to enqueue friend request notification for friendship {friendship_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error enqueueing friend request notification: {str(e)}", exc_info=True)
            return False
    
    async def send_request_accept_notification(
        self,
        friendship: FriendshipDict
    ) -> bool:
        """
        Send a push notification when a friend request is accepted.
        
        When a user accepts a friend request, this method notifies the original requester.
        The notification is sent to the user_id (original requester) about the friend_id (accepter).
        
        Parameters:
            friendship (FriendshipDict): Dictionary representing the friendship. Expected keys:
                - id (str): Friendship ID.
                - user_id (str): User ID of the person who originally sent the request.
                - friend_id (str): User ID of the person who accepted the request.
                - status (str): Should be "accepted".
        
        Returns:
            bool: `True` if the notification was enqueued successfully, `False` otherwise.
        """
        try:
            friendship_id = friendship.get("id")
            original_requester_id = friendship.get("user_id")
            accepter_id = friendship.get("friend_id")
            status = friendship.get("status", "")
            
            if not friendship_id or not original_requester_id or not accepter_id:
                logger.warning(
                    f"Missing required fields for friend accept notification: "
                    f"friendship_id={friendship_id}, requester_id={original_requester_id}, accepter_id={accepter_id}"
                )
                return False
            
            # Only send notification for accepted requests
            if status != "accepted":
                logger.info(f"Friendship {friendship_id} is not accepted, skipping notification")
                return True
            
            # Get accepter's profile information
            accepter_profile = self._get_user_profile(accepter_id)
            if not accepter_profile:
                logger.warning(f"Could not find profile for friend request accepter: {accepter_id}")
                return False
            
            accepter_name = accepter_profile.get("username") or accepter_profile.get("full_name") or "Someone"
            
            # Check if original requester has friend_activity notifications enabled
            recipient_ids = [original_requester_id]
            filtered_recipients = self._filter_recipients_by_notification_settings(
                recipient_ids,
                notification_type="friend_activity"
            )
            
            if not filtered_recipients:
                logger.info(
                    f"Original requester {original_requester_id} has friend_activity notifications disabled, "
                    f"skipping notification for friendship {friendship_id}"
                )
                return True  # Not an error, just user preference
            
            # Get push tokens for original requester
            push_tokens = self._get_push_tokens_for_users(filtered_recipients)
            
            if not push_tokens:
                logger.info(
                    f"No push tokens found for original requester {original_requester_id} "
                    f"of friendship {friendship_id}"
                )
                return True  # Not an error, just no tokens available
            
            # Create notification message
            title = "Friend Request Accepted"
            body = f"{accepter_name} accepted your friend request"
            
            # Enqueue the notification
            success = self.notification_service.enqueue_notification(
                title=title,
                body=body,
                recipients=push_tokens,
                priority="normal",
                metadata={
                    "friendship_id": friendship_id,
                    "requester_id": original_requester_id,
                    "accepter_id": accepter_id,
                    "notification_type": "friend_accept"
                },
                data={
                    "page_url": "/friends",
                }
            )
            
            if success:
                logger.info(
                    f"Friend accept notification enqueued: friendship_id={friendship_id}, "
                    f"accepter={accepter_name}, requester={original_requester_id}"
                )
            else:
                logger.error(f"Failed to enqueue friend accept notification for friendship {friendship_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error enqueueing friend accept notification: {str(e)}", exc_info=True)
            return False
    
    def _get_user_profile(self, user_id: str) -> Optional[ProfileDict]:
        """
        Retrieve the profile for a given user.
        
        Parameters:
            user_id (str): The user ID to fetch the profile for.
        
        Returns:
            ProfileDict: Profile dictionary with keys `id`, `username`, `full_name`, and `email` if the user exists, `None` otherwise.
        """
        try:
            response = self.supabase.table("profiles").select(
                "id, username, full_name, email"
            ).eq("id", user_id).single().execute()
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user profile {user_id}: {str(e)}")
            return None
    
    def _filter_recipients_by_notification_settings(
        self,
        user_ids: list[str],
        notification_type: str = "friend_requests"
    ) -> list[str]:
        """
        Filter a list of user IDs to those who have a specific notification type enabled.
        
        Parameters:
            user_ids (list[str]): User IDs to evaluate.
            notification_type (str): Notification setting key to check (e.g., "friend_requests", "friend_activity").
        
        Returns:
            list[str]: Subset of `user_ids` with the given notification type enabled. If a user's settings are missing, the user is included by default. On error, returns the original `user_ids` (fail-open).
        """
        if not user_ids:
            return []
        
        try:
            # Get notification settings from cache (batch operation)
            settings_dict = self.cache_service.get_notification_settings_batch(user_ids)
            
            # Filter users who have the notification type enabled
            # Edge case: If a user doesn't have a notification_settings record, 
            # default to enabled (opt-in by default)
            enabled_user_ids = []
            for user_id in user_ids:
                setting = settings_dict.get(user_id)
                if setting is None:
                    # No settings found - default to enabled (edge case handled)
                    logger.debug(f"No notification_settings record found for user {user_id}, defaulting to enabled")
                    enabled_user_ids.append(user_id)
                elif setting.get(notification_type, True):
                    # Settings found and notification type is enabled
                    enabled_user_ids.append(user_id)
            
            return enabled_user_ids
            
        except Exception as e:
            logger.error(f"Error filtering recipients by notification settings: {str(e)}")
            # On error, return all user_ids (fail open)
            return user_ids
    
    def _get_push_tokens_for_users(self, user_ids: list[str]) -> list[str]:
        """
        Collects Expo push tokens for the given users.
        
        Parameters:
            user_ids (list[str]): User IDs to retrieve push tokens for.
        
        Returns:
            list[str]: Flattened list of Expo push tokens for the provided users. Returns an empty list if `user_ids` is empty or if an error occurs while fetching tokens.
        """
        if not user_ids:
            return []
        
        try:
            # Get push tokens from cache (batch operation)
            tokens_dict = self.cache_service.get_push_tokens_batch(user_ids)
            
            # Edge case: Users can have multiple push tokens (multiple devices)
            # Flatten all tokens into a single list - send to all devices
            all_tokens: list[str] = []
            for user_id in user_ids:
                tokens = tokens_dict.get(user_id, [])
                if len(tokens) > 1:
                    logger.debug(f"User {user_id} has {len(tokens)} push tokens, sending to all devices")
                all_tokens.extend(tokens)
            
            return all_tokens
            
        except Exception as e:
            logger.error(f"Error fetching push tokens for users: {str(e)}")
            return []
