"""
Test script for sending push notifications directly via Expo REST API (no queue, no SDK).
All parameters are configurable at the top of the file.
"""
import asyncio
import logging
import httpx
import json

# Configure logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# ============================================================================
# CONFIGURABLE PARAMETERS - Modify these as needed
# ============================================================================

# Notification content
NOTIFICATION_TITLE = "Test Notification"
NOTIFICATION_BODY = "This is a test notification from the KeepSafe backend"

# Recipients - List of Expo push tokens
# You can provide tokens in either format:
# - Full format: "ExponentPushToken[your-token-here]"
# - Token only: "your-token-here" (script will try both if needed)
RECIPIENTS = [
    "ExponentPushToken[F-KnYxGoBtXtAKBGn_Nn6C]",
    # Alternative: Just the token part
    # "F-KnYxGoBtXtAKBGn_Nn6C",
    # Add more tokens as needed
]

# If True, will try both formats (with and without ExponentPushToken wrapper)
# If False, will use the token exactly as provided
TRY_BOTH_FORMATS = True

# Priority: "default", "normal", or "high"
PRIORITY = "default"

# Optional data dictionary to be sent with the push notification
# This will be included in the notification payload
DATA = {
    "type": "test",
    "action": "test_notification",
    "timestamp": "2026-01-04T05:00:00Z"
}

# Retry settings (for rate limit handling)
MAX_RETRIES = 3

# ============================================================================
# TEST FUNCTION
# ============================================================================

def normalize_token(token: str) -> str:
    """Normalize token format - extract token from ExponentPushToken[...] if needed."""
    token = token.strip()
    # If it's in ExponentPushToken[...] format, extract the token part
    if token.startswith("ExponentPushToken[") and token.endswith("]"):
        return token[18:-1]  # Remove "ExponentPushToken[" and "]"
    return token


def format_token_for_expo(token: str) -> str:
    """Format token for Expo SDK - add ExponentPushToken wrapper if not present."""
    token = token.strip()
    if not token.startswith("ExponentPushToken["):
        return f"ExponentPushToken[{token}]"
    return token


async def send_notification_via_rest_api(
    title: str,
    body: str,
    recipients: list[str],
    priority: str = "default",
    data: dict | None = None,
    retry_count: int = 0,
    max_retries: int = 3
) -> tuple[bool, dict]:
    """
    Send a push notification via Expo REST API.
    
    Returns:
        tuple: (success: bool, response_data: dict)
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
            
            return all_success, {"tickets": tickets, "raw_response": result}
            
    except httpx.HTTPStatusError as e:
        # Handle HTTP errors (like 429 rate limit)
        error_msg = str(e)
        is_rate_limit = e.response.status_code == 429
        
        if is_rate_limit and retry_count < max_retries:
            # Exponential backoff for rate limits
            import random
            delay = min(2 ** retry_count + random.uniform(0, 1), 60)
            print(f"   ⚠️  Rate limit hit (HTTP 429), waiting {delay:.2f} seconds before retry...")
            await asyncio.sleep(delay)
            return await send_notification_via_rest_api(
                title=title,
                body=body,
                recipients=recipients,
                priority=priority,
                data=data,
                retry_count=retry_count + 1,
                max_retries=max_retries
            )
        
        return False, {"error": error_msg, "status_code": e.response.status_code}
        
    except Exception as e:
        return False, {"error": str(e)}


async def test_send_notification():
    """Test sending a notification directly via Expo REST API."""
    print("\n" + "="*60)
    print("TEST: Sending Notification via REST API")
    print("="*60)
    
    print(f"Title: {NOTIFICATION_TITLE}")
    print(f"Body: {NOTIFICATION_BODY}")
    print(f"Recipients: {len(RECIPIENTS)} token(s)")
    for i, token in enumerate(RECIPIENTS, 1):
        print(f"  {i}. {token}")
    print(f"Priority: {PRIORITY}")
    print(f"Data: {DATA}")
    print(f"Max Retries: {MAX_RETRIES}")
    print(f"Try Both Formats: {TRY_BOTH_FORMATS}")
    print()
    
    # Prepare recipients - try different formats if needed
    recipients_to_try = []
    if TRY_BOTH_FORMATS:
        for token in RECIPIENTS:
            # Try the token as-is first
            recipients_to_try.append((token, "original"))
            # Try normalized (without wrapper)
            normalized = normalize_token(token)
            if normalized != token:
                recipients_to_try.append((normalized, "normalized (no wrapper)"))
            # Try with wrapper if it doesn't have it
            formatted = format_token_for_expo(token)
            if formatted != token:
                recipients_to_try.append((formatted, "formatted (with wrapper)"))
    else:
        recipients_to_try = [(token, "as provided") for token in RECIPIENTS]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_recipients = []
    for token, desc in recipients_to_try:
        if token not in seen:
            seen.add(token)
            unique_recipients.append((token, desc))
    
    print("Attempting to send with the following token format(s):")
    for i, (token, desc) in enumerate(unique_recipients, 1):
        print(f"  Attempt {i}: {token} ({desc})")
    print()
    
    # Try each format until one works
    last_error = None
    last_response = None
    for token, desc in unique_recipients:
        print(f"Trying: {token} ({desc})...")
        try:
            success, response_data = await send_notification_via_rest_api(
                title=NOTIFICATION_TITLE,
                body=NOTIFICATION_BODY,
                recipients=[token],
                priority=PRIORITY,
                data=DATA,
                retry_count=0,
                max_retries=MAX_RETRIES
            )
            
            if success:
                print(f"\n✅ Notification sent successfully with format: {desc}!")
                print(f"   Working token format: {token}")
                if "tickets" in response_data:
                    for ticket in response_data["tickets"]:
                        if isinstance(ticket, dict):
                            print(f"   Ticket: {ticket.get('status', 'unknown')} - {ticket.get('id', 'N/A')}")
                return True
            else:
                error_info = response_data.get("error", "Unknown error")
                print(f"   ❌ Failed: {error_info}")
                last_error = error_info
                last_response = response_data
                
                # Check if it's an invalid token error
                if "tickets" in response_data:
                    for ticket in response_data["tickets"]:
                        if isinstance(ticket, dict) and ticket.get("status") == "error":
                            error_details = ticket.get("details", {})
                            error_message = ticket.get("message", "Unknown error")
                            print(f"   Error details: {error_message}")
                            if "InvalidPushTokenException" in error_message or "invalid" in error_message.lower():
                                print(f"   ⚠️  Token format rejected: {error_message}")
                                continue
                continue
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            last_error = str(e)
            continue
    
    # If we get here, all formats failed
    print("\n❌ All token formats failed")
    if last_error:
        print(f"Last error: {last_error}")
    if last_response:
        print(f"Last response: {json.dumps(last_response, indent=2)}")
    print("\n💡 Tips:")
    print("   1. Make sure the token is from a real device (not simulator)")
    print("   2. Verify the token is from the correct Expo project")
    print("   3. Check if the token has expired")
    print("   4. Try getting a fresh token from your app")
    return False


async def main():
    """Main test function."""
    print("\n" + "="*60)
    print("NOTIFICATION DIRECT SEND TEST")
    print("="*60)
    
    try:
        success = await test_send_notification()
        
        print("\n" + "="*60)
        if success:
            print("TEST COMPLETE - Notification sent!")
        else:
            print("TEST COMPLETE - Notification failed to send")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
