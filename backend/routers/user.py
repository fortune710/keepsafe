import logging
import json
import threading
import uuid
import html
from datetime import datetime, timezone
from enum import Enum

from fastapi import APIRouter, HTTPException, Depends, Response, BackgroundTasks
from services.pinecone_client import get_pinecone_index
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user

class ExportFormat(str, Enum):
    json = "json"
    html = "html"

router = APIRouter(prefix="/user", tags=["user"])
logger = logging.getLogger(__name__)

# Global export jobs storage
export_jobs = {}
export_jobs_lock = threading.Lock()

@router.get("/me")
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """
    Test endpoint that returns the current authenticated user's information.
    Useful for debugging and verifying authentication is working correctly.
    """
    try:
        user_info = {
            "id": current_user.user.id,
            "email": current_user.user.email,
            "email_confirmed_at": current_user.user.email_confirmed_at,
            "created_at": current_user.user.created_at,
            "updated_at": current_user.user.updated_at,
            "last_sign_in_at": current_user.user.last_sign_in_at,
            "app_metadata": current_user.user.app_metadata,
            "user_metadata": current_user.user.user_metadata,
        }
        
        logger.info(f"Returning user info for user_id: {current_user.user.id}")
        return {
            "status": "success",
            "user": user_info
        }
    except Exception as e:
        logger.exception("Failed to get user info")
        raise HTTPException(status_code=500, detail="Failed to retrieve user information") from e

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
    
    try:
        data = _fetch_export_data(user_id)

        if format == ExportFormat.html:
            html_content = _generate_html_export_content(user_id, data)
            logger.info(f"Exported HTML data for user_id: {user_id}")
            return Response(
                content=html_content,
                media_type="text/html",
                headers={"Content-Disposition": f"attachment; filename=user_data_{user_id}.html"}
            )

        # Default to JSON
        export_data = {
            "user_id": user_id,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "profile": data["profile"],
            "entries": data["entries"],
            "friendships": data["friendships"]
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


# --- Helper Functions and Background Tasks ---

def _fetch_export_data(user_id: str) -> dict:
    """Fetch all user data for export."""
    supabase = get_supabase_client()
    
    # 1. Fetch Profile
    logger.info(f"Fetching profile for user_id: {user_id}")
    profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    profile_data = profile_response.data[0] if profile_response.data else None
    
    # 2. Fetch Entries
    logger.info(f"Fetching entries for user_id: {user_id}")
    entries_response = supabase.table("entries").select("*").eq("user_id", user_id).execute()
    entries_data = entries_response.data
    logger.info(f"Found {len(entries_data)} entries")
    
    # 3. Fetch Friendships
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

    return {
        "profile": remove_none(profile_data) if profile_data else None,
        "entries": remove_none(entries_data),
        "friendships": remove_none(friendships_data)
    }

def _generate_html_export_content(user_id: str, data: dict) -> str:
    """Generate HTML content for user export."""
    
    def validate_url(url: str) -> str:
        if not url:
            return ""
        if url.lower().startswith(('http://', 'https://')):
            return html.escape(url)
        return ""

    profile_data = data["profile"]
    entries_data = data["entries"]
    friendships_data = data["friendships"]

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
        <div class="meta">Exported on: {html.escape(datetime.now(timezone.utc).isoformat())}</div>
        
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
    return html_content

def _prune_export_jobs():
    """Remove export jobs older than 1 hour"""
    cutoff = datetime.now(timezone.utc).timestamp() - 3600
    with export_jobs_lock:
        to_delete = [
            jid for jid, job in export_jobs.items() 
            if job.get("created_at_ts", 0) < cutoff
        ]
        for jid in to_delete:
            del export_jobs[jid]

def _run_export_job(job_id: str, user_id: str, format: ExportFormat):
    """Background task to generate export."""
    try:
        # Perform expensive data fetching without lock
        data = _fetch_export_data(user_id)
        
        result_content = ""
        if format == ExportFormat.html:
            result_content = _generate_html_export_content(user_id, data)
        else:
            export_data = {
                "user_id": user_id,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "profile": data["profile"],
                "entries": data["entries"],
                "friendships": data["friendships"]
            }
            result_content = json.dumps(export_data, default=str, indent=2)
        
        # Update state with lock
        with export_jobs_lock:
            job = export_jobs.get(job_id)
            if job:
                job["status"] = "completed"
                job["result"] = result_content 
                logger.info(f"Export job {job_id} completed for user {user_id}")

    except Exception as exc:
        logger.exception(f"Export job {job_id} failed")
        with export_jobs_lock:
            job = export_jobs.get(job_id)
            if job:
                job["status"] = "failed"
                job["error"] = str(exc)

@router.post("/{user_id}/export/start")
async def start_user_export(
    user_id: str,
    background_tasks: BackgroundTasks,
    format: ExportFormat = ExportFormat.json,
    current_user = Depends(get_current_user)
):
    """Start a background export job."""
    if current_user.user.id != user_id:
        logger.warning(f"Unauthorized export attempt. User {current_user.user.id} tried to export {user_id}")
        raise HTTPException(status_code=403, detail="Not authorized")
    
    job_id = str(uuid.uuid4())
    
    with export_jobs_lock:
        # Also prune old jobs occasionally
        # We can run prune as a background task too
        
        export_jobs[job_id] = {
            "id": job_id,
            "user_id": user_id,
            "format": format,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_at_ts": datetime.now(timezone.utc).timestamp()
        }
    
    background_tasks.add_task(_run_export_job, job_id, user_id, format)
    background_tasks.add_task(_prune_export_jobs)
    
    return {
        "job_id": job_id, 
        "status": "pending", 
        "message": "Export started. Poll status at /user/{user_id}/export/status/{job_id}"
    }

@router.get("/{user_id}/export/status/{job_id}")
async def get_export_job_status(
    user_id: str, 
    job_id: str, 
    current_user = Depends(get_current_user)
):
    """Check status of an export job."""
    if current_user.user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    with export_jobs_lock:
        job = export_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Return a copy to avoid exposing the internal result blob in the status check
        return {k: v for k, v in job.items() if k != "result"}

@router.get("/{user_id}/export/download/{job_id}")
async def download_export_job_result(
    user_id: str, 
    job_id: str, 
    current_user = Depends(get_current_user)
):
    """Download result of a completed export job."""
    if current_user.user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    with export_jobs_lock:
        job = export_jobs.get(job_id)
        
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
        
    result_content = job.get("result")
    format_type = job.get("format", ExportFormat.json)
    
    if format_type == ExportFormat.html:
        return Response(
            content=result_content,
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename=user_data_{user_id}.html"}
        )
    else:
         return Response(
            content=result_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=user_data_{user_id}.json"}
        )
