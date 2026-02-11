from typing import Dict, Any, List, Optional, TypedDict
import logging
from services.notification_service import NotificationService
from services.supabase_client import get_supabase_client
from services.cache_service import CacheService

logger = logging.getLogger(__name__)


class EntryDict(TypedDict, total=False):
    """Type definition for entry dictionary."""
    id: str
    user_id: str
    type: str  # 'photo' | 'video' | 'audio'
    shared_with: Optional[List[str]]
    shared_with_everyone: bool
    is_private: bool
    content_url: Optional[str]
    text_content: Optional[str]


class ProfileDict(TypedDict, total=False):
    """Type definition for profile dictionary."""
    id: str
    username: Optional[str]
    full_name: Optional[str]
    email: Optional[str]


class FriendDict(TypedDict, total=False):
    """Type definition for friend dictionary."""
    friend_id: str


class NotificationSettingDict(TypedDict, total=False):
    """Type definition for notification setting dictionary."""
    user_id: str
    friend_activity: bool
    push_notifications: bool
    friend_requests: bool
    entry_reminder: bool


class PushTokenDict(TypedDict, total=False):
    """Type definition for push token dictionary."""
    token: str
    user_id: str


class NotificationEnqueueService:
    """Service for enqueuing different types of notifications."""
    
    def __init__(self):
        """
        Initialize NotificationEnqueueService.
        
        Sets up the Supabase client, a NotificationService, and a CacheService, and logs completion.
        
        Attributes:
            supabase: Supabase client used for database queries.
            notification_service: Service responsible for enqueuing notifications.
            cache_service: Cache service used for batching settings and push tokens.
        """
        self.supabase = get_supabase_client()
        self.notification_service = NotificationService()
        self.cache_service = CacheService()
        logger.info("NotificationEnqueueService initialized")
    
    async def enqueue_entry_notification(
        self,
        entry: EntryDict
    ) -> bool:
        """
        Enqueue push notifications for users when an entry is shared.
        
        Determines recipients from the entry's sharing fields, filters them by their friend-activity notification setting, resolves push tokens, and enqueues a notification payload describing the shared entry.
        
        Parameters:
            entry (EntryDict): Dictionary representing the entry. Expected keys:
                - id (str): Entry ID.
                - user_id (str): Owner's user ID.
                - type (str, optional): Entry type (e.g., "photo", "video", "audio").
                - shared_with (List[str], optional): User IDs explicitly shared with.
                - shared_with_everyone (bool, optional): True if shared with all friends.
                - is_private (bool, optional): True if the entry is private.
        
        Returns:
            bool: `True` if the notification was enqueued successfully, `False` otherwise.
        """
        try:
            entry_id = entry.get("id")
            owner_id = entry.get("user_id")
            entry_type = entry.get("type", "entry")
            shared_with = entry.get("shared_with") or []
            shared_with_everyone = entry.get("shared_with_everyone", False)
            is_private = entry.get("is_private", False)
            
            if not entry_id or not owner_id:
                logger.warning(f"Missing required fields for entry notification: entry_id={entry_id}, owner_id={owner_id}")
                return False
            
            # Skip notification if entry is private and not shared
            if is_private and not shared_with and not shared_with_everyone:
                logger.info(f"Entry {entry_id} is private and not shared, skipping notification")
                return True
            
            # Get owner's profile information
            owner_profile = self._get_user_profile(owner_id)
            if not owner_profile:
                logger.warning(f"Could not find profile for entry owner: {owner_id}")
                return False
            
            owner_name = owner_profile.get("username") or owner_profile.get("full_name") or "Someone"
            
            # Remove owner from the list of recipients
            recipient_user_ids: List[str] = [user_id for user_id in shared_with if user_id != owner_id] if isinstance(shared_with, list) else []
            

            if not recipient_user_ids:
                logger.info(f"No recipients found for entry {entry_id}")
                return True  # Not an error, just no one to notify
            
            # Filter recipients based on notification settings
            # Only include users who have friend_activity notifications enabled
            filtered_recipients = self._filter_recipients_by_notification_settings(
                recipient_user_ids,
                notification_type="friend_activity"
            )
            
            if not filtered_recipients:
                logger.info(f"No recipients with friend_activity notifications enabled for entry {entry_id}")
                return True  # Not an error, just no one wants notifications
            
            # Get push tokens for filtered recipients
            push_tokens = self._get_push_tokens_for_users(filtered_recipients)
            
            if not push_tokens:
                logger.info(f"No push tokens found for recipients of entry {entry_id}")
                return True  # Not an error, just no tokens available
            
            # Create notification message
            entry_type_display = f"a {entry_type.capitalize()}" if entry_type != "audio" else "an audio recording"
            title = "New Entry Shared"
            body = f"{owner_name} shared {entry_type_display} with you"
            
            # Enqueue the notification
            success = self.notification_service.enqueue_notification(
                title=title,
                body=body,
                recipients=push_tokens,
                priority="normal",
                metadata={
                    "entry_id": entry_id,
                    "owner_id": owner_id,
                    "entry_type": entry_type,
                    "notification_type": "entry_share"
                },
                data={
                    "page_url": "/vault?refresh=true",
                }
            )
            
            if success:
                logger.info(
                    f"Entry notification enqueued: entry_id={entry_id}, "
                    f"recipients={len(push_tokens)}, owner={owner_name}"
                )
            else:
                logger.error(f"Failed to enqueue entry notification for entry {entry_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error enqueueing entry notification: {str(e)}", exc_info=True)
            return False
    
    def _get_user_profile(self, user_id: str) -> Optional[ProfileDict]:
        """
        Retrieve the profile for a given user.
        
        Returns:
            ProfileDict: Profile dictionary with keys `id`, `username`, `full_name`, and `email` if the user exists, `None` otherwise.
        """
        try:
            response = self.supabase.table("profiles").select("id, username, full_name, email").eq("id", user_id).single().execute()
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user profile {user_id}: {str(e)}")
            return None
        
    def _filter_recipients_by_notification_settings(
        self,
        user_ids: List[str],
        notification_type: str = "friend_activity"
    ) -> List[str]:
        """
        Filter a list of user IDs to those who have a specific notification type enabled.
        
        Parameters:
        	user_ids (List[str]): User IDs to evaluate.
        	notification_type (str): Notification setting key to check (e.g., "friend_activity", "push_notifications").
        
        Returns:
        	List[str]: Subset of `user_ids` with the given notification type enabled. If a user's settings are missing, the user is included by default. On error, returns the original `user_ids` (fail-open).
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
    
    def _get_push_tokens_for_users(self, user_ids: List[str]) -> List[str]:
        """
        Collects Expo push tokens for the given users.
        
        Parameters:
            user_ids (List[str]): User IDs to retrieve push tokens for.
        
        Returns:
            List[str]: Flattened list of Expo push tokens for the provided users. Returns an empty list if `user_ids` is empty or if an error occurs while fetching tokens.
        """
        if not user_ids:
            return []
        
        try:
            # Get push tokens from cache (batch operation)
            tokens_dict = self.cache_service.get_push_tokens_batch(user_ids)
            
            # Edge case: Users can have multiple push tokens (multiple devices)
            # Flatten all tokens into a single list - send to all devices
            all_tokens: List[str] = []
            for user_id in user_ids:
                tokens = tokens_dict.get(user_id, [])
                if len(tokens) > 1:
                    logger.debug(f"User {user_id} has {len(tokens)} push tokens, sending to all devices")
                all_tokens.extend(tokens)
            
            return all_tokens
            
        except Exception as e:
            logger.error(f"Error fetching push tokens for users: {str(e)}")
            return []
