import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Response
from services.pinecone_client import get_pinecone_index
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user
import json
from enum import Enum

class ExportFormat(str, Enum):
    json = "json"
    html = "html"

router = APIRouter(prefix="/user", tags=["user"])
logger = logging.getLogger(__name__)

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """
    Delete a user's account and all associated data.
    This includes:
    1. Deleting all vectors from Pinecone with the matching user_id metadata.
    2. Deleting the user from Supabase Auth (which cascades to public tables if configured).
    """
    logger.info(f"Initiating account deletion for user_id: {user_id}")

    # Authorization Check
    # Ensure the requester is deleting their own account (or implement admin check here)
    if current_user.user.id != user_id:
        logger.warning(f"Unauthorized deletion attempt. User {current_user.user.id} tried to delete {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this account")
    
    try:
        # 1. Delete from Pinecone
        try:
            index = get_pinecone_index()
            # Delete vectors where metadata['user_id'] matches
            # Note: delete by metadata filter is supported in Pinecone
            index.delete(filter={"user_id": user_id})
            logger.info(f"Deleted Pinecone vectors for user_id: {user_id}")
        except Exception as e:
            logger.exception(f"Failed to delete Pinecone vectors for user_id: {user_id}")
            # We continue even if Pinecone fails, as we want to ensure the account is deleted
            pass

        # 2. Delete from Supabase
        supabase = get_supabase_client()
        
        # 2a. Delete from public.profiles explicitly first
        # We do this first to ensure application data is removed even if Auth delete fails
        try:
            supabase.table("profiles").delete().eq("id", user_id).execute()
            logger.info(f"Deleted user profile from public.profiles: {user_id}")
        except Exception as db_error:
            logger.exception(f"Failed to delete user profile for user_id: {user_id}")
            raise HTTPException(status_code=500, detail="Failed to delete user data") from db_error

        # 2b. Try to delete from Auth (requires service role usually)
        try:
            # Attempt to delete the user from the Auth system
            supabase.auth.admin.delete_user(user_id)
            logger.info(f"Deleted user from Supabase Auth: {user_id}")
        except Exception as auth_error:
            # If auth delete fails (e.g. permission), we just log it since we already cleaned up data
            logger.exception(f"Failed to delete from Supabase Auth for user_id: {user_id}")

        return {"message": "Account deletion processed", "user_id": user_id}

    except Exception as e:
        logger.exception(f"Error during account deletion for user_id: {user_id}")
        raise HTTPException(status_code=500, detail="An error occurred during account deletion") from e

@router.get("/{user_id}/export")
def download_user_data(
    user_id: str,
    format: ExportFormat = ExportFormat.json,
    current_user = Depends(get_current_user)
):
    """
    Export all user data to a JSON or HTML file.
    Includes profile, entries (with content URLs and attachments), and friendships.
    """
    if current_user.user.id != user_id:
        logger.warning(f"Unauthorized export attempt. User {current_user.user.id} tried to export {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized to export this user's data")
    
    supabase = get_supabase_client()
    
    try:
        # 1. Fetch Profile
        logger.info(f"Fetching profile for user_id: {user_id}")
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        profile_data = profile_response.data[0] if profile_response.data else None
        
        # 2. Fetch Entries
        logger.info(f"Fetching entries for user_id: {user_id}")
        entries_response = supabase.table("entries").select("*").eq("user_id", user_id).execute()
        entries_data = entries_response.data
        logger.info(f"Found {len(entries_data)} entries")
        
        # 3. Fetch Friendships (both as user and as friend)
        logger.info(f"Fetching friendships for user_id: {user_id}")
        friendships_response = supabase.table("friendships").select("*").or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}").execute()
        friendships_data = friendships_response.data
        logger.info(f"Found {len(friendships_data)} friendships")

        # 4. Filter None values
        def remove_none(obj):
            if isinstance(obj, dict):
                return {k: remove_none(v) for k, v in obj.items() if v is not None}
            elif isinstance(obj, list):
                return [remove_none(v) for v in obj if v is not None]
            return obj

        profile_data = remove_none(profile_data) if profile_data else None
        entries_data = remove_none(entries_data)
        friendships_data = remove_none(friendships_data)

        if format == ExportFormat.html:
            import html
            
            def validate_url(url: str) -> str:
                if not url: return ""
                # Simple scheme check to prevent javascript: or data: exploits
                if url.lower().startswith(('http://', 'https://')):
                    return html.escape(url)
                return ""

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
                    h1, h2 {{ color: #2c3e50; }}
                    .section {{ margin-bottom: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px; }}
                    .entry {{ margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0; }}
                    .entry:last-child {{ border-bottom: none; }}
                    .meta {{ color: #666; font-size: 0.9em; }}
                    a {{ color: #3498db; text-decoration: none; }}
                    a:hover {{ text-decoration: underline; }}
                </style>
            </head>
            <body>
                <h1>User Data Export</h1>
                <div class="meta">Exported on: {html.escape(datetime.now().isoformat())}</div>
                
                <div class="section">
                    <h2>Profile</h2>
                    <pre>{html.escape(json.dumps(profile_data, indent=2, default=str))}</pre>
                </div>

                <div class="section">
                    <h2>Entries ({len(entries_data)})</h2>
            """
            
            for entry in entries_data:
                # Sanitize Content URL
                raw_url = entry.get('content_url')
                safe_url = validate_url(str(raw_url)) if raw_url else ""
                link_html = f'<p><strong>Content:</strong> <a href="{safe_url}" target="_blank">View Media</a></p>' if safe_url else ''
                
                # Escape all other fields
                safe_id = html.escape(str(entry.get('id', '')))
                safe_type = html.escape(str(entry.get('type', '')))
                safe_text = html.escape(str(entry.get('text_content') or 'N/A'))
                safe_date = html.escape(str(entry.get('created_at', '')))

                html_content += f"""
                    <div class="entry">
                        <p><strong>ID:</strong> {safe_id}</p>
                        <p><strong>Type:</strong> {safe_type}</p>
                        <p><strong>Text:</strong> {safe_text}</p>
                        {link_html}
                        <p class="meta">Created: {safe_date}</p>
                    </div>
                """
            
            html_content += f"""
                </div>

                <div class="section">
                    <h2>Friendships ({len(friendships_data)})</h2>
                    <pre>{html.escape(json.dumps(friendships_data, indent=2, default=str))}</pre>
                </div>
            </body>
            </html>
            """
            
            logger.info(f"Exported HTML data for user_id: {user_id}")
            return Response(
                content=html_content,
                media_type="text/html",
                headers={"Content-Disposition": f"attachment; filename=user_data_{user_id}.html"}
            )

        # Default to JSON
        export_data = {
            "user_id": user_id,
            "exported_at": datetime.now().isoformat(),
            "profile": profile_data,
            "entries": entries_data,
            "friendships": friendships_data
        }
        
        json_str = json.dumps(export_data, default=str, indent=2)
        logger.info(f"Exported JSON data for user_id: {user_id}")
        return Response(
            content=json_str,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=user_data_{user_id}.json"}
        )

    except Exception as e:
        logger.exception(f"Failed to export data for user_id: {user_id}")
        raise HTTPException(status_code=500, detail="Failed to export user data") from e

