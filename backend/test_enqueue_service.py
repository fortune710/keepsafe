"""
Test script for the NotificationEnqueueService.
Tests the enqueue_entry_notification method with configurable entry data.
"""
import asyncio
import logging
import sys
import os

# Add backend directory to path
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

# Configure logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

from services.notification_enqueue_service import NotificationEnqueueService

# ============================================================================
# CONFIGURABLE PARAMETERS - Modify these as needed
# ============================================================================

# Entry data to test with
# Replace these with real values from your database
ENTRY_ID = "018eabe2-222d-4d14-974b-771b490f54c2"  # Replace with a real entry ID
OWNER_USER_ID = "64cbe7e2-1fd3-4370-8832-e3f96e010a88"  # Replace with a real user ID who owns the entry
ENTRY_TYPE = "photo"  # Options: "photo", "video", "audio", or "entry"

# Sharing configuration
# Option 1: Share with specific users (provide their user IDs)
SHARED_WITH_USER_IDS = [
    "d745ed21-5667-4595-bf76-8505ccf63d8b"
    # "user-id-2",
]

# Option 2: Share with everyone (all friends)
SHARED_WITH_EVERYONE = True  # Set to True to share with all friends

# Option 3: Private entry (not shared)
IS_PRIVATE = False  # Set to True for private entries

# Optional entry fields
CONTENT_URL = None  # Optional: URL to the entry content
TEXT_CONTENT = None  # Optional: Text content of the entry

# ============================================================================
# TEST FUNCTION
# ============================================================================

async def test_enqueue_entry_notification():
    """Test enqueueing an entry notification."""
    print("\n" + "="*60)
    print("TEST: NotificationEnqueueService - Entry Notification")
    print("="*60)
    
    # Prepare entry dictionary
    entry = {
        "id": ENTRY_ID,
        "user_id": OWNER_USER_ID,
        "type": ENTRY_TYPE,
        "is_private": IS_PRIVATE,
    }
    
    # Add sharing configuration
    if SHARED_WITH_EVERYONE:
        entry["shared_with_everyone"] = True
        entry["shared_with"] = SHARED_WITH_USER_IDS
        print(f"Sharing mode: With everyone ({len(SHARED_WITH_USER_IDS)} user(s))")
    else:
        entry["shared_with"] = SHARED_WITH_USER_IDS
        entry["shared_with_everyone"] = False
        print(f"Sharing mode: With specific users ({len(SHARED_WITH_USER_IDS)} user(s))")
    
    # Add optional fields if provided
    if CONTENT_URL:
        entry["content_url"] = CONTENT_URL
    if TEXT_CONTENT:
        entry["text_content"] = TEXT_CONTENT
    
    print(f"\nEntry Configuration:")
    print(f"  Entry ID: {entry['id']}")
    print(f"  Owner User ID: {entry['user_id']}")
    print(f"  Entry Type: {entry['type']}")
    print(f"  Is Private: {entry['is_private']}")
    print(f"  Shared With Everyone: {entry.get('shared_with_everyone', False)}")
    print(f"  Shared With: {entry.get('shared_with', [])}")
    if CONTENT_URL:
        print(f"  Content URL: {CONTENT_URL}")
    if TEXT_CONTENT:
        print(f"  Text Content: {TEXT_CONTENT[:50]}..." if len(TEXT_CONTENT) > 50 else f"  Text Content: {TEXT_CONTENT}")
    print()
    
    # Validate configuration
    if ENTRY_ID == "your-entry-id-here" or OWNER_USER_ID == "your-user-id-here":
        print("❌ ERROR: Please configure ENTRY_ID and OWNER_USER_ID at the top of this file")
        print("   These should be real values from your database")
        return False
    
    try:
        # Initialize the service
        print("Initializing NotificationEnqueueService...")
        service = NotificationEnqueueService()
        print("✅ Service initialized successfully\n")
        
        # Test enqueueing the notification
        print("Enqueueing entry notification...")
        success = await service.enqueue_entry_notification(entry)
        
        if success:
            print("\n✅ SUCCESS: Entry notification enqueued successfully!")
            print("\nThe notification has been added to the queue.")
            print("It will be processed by the notification service worker.")
            print("\nTo verify:")
            print("  1. Check the notification queue in your database")
            print("  2. Check if recipients received push notifications")
            print("  3. Check logs for notification processing")
            return True
        else:
            print("\n❌ FAILED: Entry notification failed to enqueue")
            print("\nPossible reasons:")
            print("  - Entry owner profile not found")
            print("  - No recipients found (no friends or sharing settings)")
            print("  - Recipients don't have friend_activity notifications enabled")
            print("  - No push tokens found for recipients")
            print("  - Queue service error")
            return False
            
    except ValueError as e:
        print(f"\n❌ CONFIGURATION ERROR: {str(e)}")
        print("\nMake sure you have set the following environment variables:")
        print("  - SUPABASE_URL")
        print("  - SUPABASE_KEY")
        print("  - NOTIFICATION_QUEUE_NAME (optional, defaults to 'notifications_q')")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_with_real_data_interactive():
    """Interactive test that helps you find real data from your database."""
    print("\n" + "="*60)
    print("INTERACTIVE TEST: Find Real Entry Data")
    print("="*60)
    print("\nThis will help you find real entry and user IDs from your database.")
    print("You can then use these values in the test script.\n")
    
    try:
        service = NotificationEnqueueService()
        
        # Try to get some sample entries
        print("Fetching sample entries from database...")
        response = service.supabase.table("entries").select("id, user_id, type, shared_with, shared_with_everyone, is_private").limit(5).execute()
        
        if response.data and len(response.data) > 0:
            print(f"\n✅ Found {len(response.data)} sample entry(ies):\n")
            for i, entry in enumerate(response.data, 1):
                print(f"Entry {i}:")
                print(f"  ID: {entry.get('id')}")
                print(f"  Owner User ID: {entry.get('user_id')}")
                print(f"  Type: {entry.get('type', 'entry')}")
                print(f"  Shared With Everyone: {entry.get('shared_with_everyone', False)}")
                print(f"  Is Private: {entry.get('is_private', False)}")
                print()
            
            print("You can copy these values to the test script configuration.")
        else:
            print("⚠️  No entries found in database.")
            print("   Make sure you have entries in your 'entries' table.")
        
        # Try to get some sample users
        print("\nFetching sample users from database...")
        response = service.supabase.table("profiles").select("id, username, full_name").limit(5).execute()
        
        if response.data and len(response.data) > 0:
            print(f"\n✅ Found {len(response.data)} sample user(s):\n")
            for i, profile in enumerate(response.data, 1):
                print(f"User {i}:")
                print(f"  ID: {profile.get('id')}")
                print(f"  Username: {profile.get('username', 'N/A')}")
                print(f"  Full Name: {profile.get('full_name', 'N/A')}")
                print()
        else:
            print("⚠️  No users found in database.")
            print("   Make sure you have profiles in your 'profiles' table.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test function."""
    print("\n" + "="*60)
    print("NOTIFICATION ENQUEUE SERVICE TEST")
    print("="*60)
    
    # Check if user wants interactive mode
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        success = await test_with_real_data_interactive()
    else:
        success = await test_enqueue_entry_notification()
    
    print("\n" + "="*60)
    if success:
        print("TEST COMPLETE")
    else:
        print("TEST FAILED")
    print("="*60)
    print("\n💡 Tip: Run with --interactive flag to find real data:")
    print("   python test_enqueue_service.py --interactive")


if __name__ == "__main__":
    asyncio.run(main())
