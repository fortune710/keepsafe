import json
import logging
import tempfile
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Tuple

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse

from services.pinecone_client import get_pinecone_index
from services.supabase_client import get_supabase_client
from utils.auth import get_current_user

class ExportFormat(str, Enum):
    json = "json"
    html = "html"

router = APIRouter(prefix="/user", tags=["user"])
logger = logging.getLogger(__name__)

EXPORT_BASE_DIR = Path(tempfile.gettempdir()) / "keepsafe_exports"
EXPORT_BASE_DIR.mkdir(parents=True, exist_ok=True)

ExportJobState = Dict[str, Any]
export_jobs: Dict[str, ExportJobState] = {}

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

def _fetch_user_export_data(user_id: str) -> Dict[str, Any]:
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

    # 3. Fetch Friendships (both as user and as friend)
    logger.info(f"Fetching friendships for user_id: {user_id}")
    friendships_response = (
        supabase.table("friendships")
        .select("*")
        .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}")
        .execute()
    )
    friendships_data = friendships_response.data
    logger.info(f"Found {len(friendships_data)} friendships")

    def remove_none(obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: remove_none(v) for k, v in obj.items() if v is not None}
        if isinstance(obj, list):
            return [remove_none(v) for v in obj if v is not None]
        return obj

    profile_data = remove_none(profile_data) if profile_data else None
    entries_data = remove_none(entries_data)
    friendships_data = remove_none(friendships_data)

    return {
        "profile": profile_data,
        "entries": entries_data,
        "friendships": friendships_data,
    }


def _render_export_content(
    user_id: str, format: ExportFormat, payload: Dict[str, Any]
) -> Tuple[bytes, str, str]:
    profile_data = payload["profile"]
    entries_data = payload["entries"]
    friendships_data = payload["friendships"]

    if format == ExportFormat.html:
        import html

        def validate_url(url: str) -> str:
            if not url:
                return ""
            if url.lower().startswith(("http://", "https://")):
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
                <div class="meta">Exported on: {html.escape(datetime.now(timezone.utc).isoformat())}</div>
                
                <div class="section">
                    <h2>Profile</h2>
                    <pre>{html.escape(json.dumps(profile_data, indent=2, default=str))}</pre>
                </div>

                <div class="section">
                    <h2>Entries ({len(entries_data)})</h2>
            """

        for entry in entries_data:
            raw_url = entry.get("content_url")
            safe_url = validate_url(str(raw_url)) if raw_url else ""
            link_html = (
                f'<p><strong>Content:</strong> <a href="{safe_url}" target="_blank">View Media</a></p>'
                if safe_url
                else ""
            )

            safe_id = html.escape(str(entry.get("id", "")))
            safe_type = html.escape(str(entry.get("type", "")))
            safe_text = html.escape(str(entry.get("text_content") or "N/A"))
            safe_date = html.escape(str(entry.get("created_at", "")))

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

        logger.info(f"Rendered HTML export for user_id: {user_id}")
        return (
            html_content.encode("utf-8"),
            "text/html",
            f"user_data_{user_id}.html",
        )

    export_data = {
        "user_id": user_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile_data,
        "entries": entries_data,
        "friendships": friendships_data,
    }

    json_str = json.dumps(export_data, default=str, indent=2)
    logger.info(f"Rendered JSON export for user_id: {user_id}")
    return (
        json_str.encode("utf-8"),
        "application/json",
        f"user_data_{user_id}.json",
    )


def _run_export_job(user_id: str, format: ExportFormat, job_id: str) -> None:
    try:
        logger.info("Starting export job %s for user_id=%s", job_id, user_id)
        payload = _fetch_user_export_data(user_id)
        content, media_type, filename = _render_export_content(user_id, format, payload)

        EXPORT_BASE_DIR.mkdir(parents=True, exist_ok=True)
        file_path = EXPORT_BASE_DIR / f"{job_id}_{filename}"
        file_path.write_bytes(content)

        export_jobs[job_id]["status"] = "completed"
        export_jobs[job_id]["file_path"] = str(file_path)
        export_jobs[job_id]["media_type"] = media_type
        export_jobs[job_id]["filename"] = filename
        export_jobs[job_id]["completed_at"] = datetime.now(timezone.utc).isoformat()

        logger.info("Completed export job %s, file=%s", job_id, file_path)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed export job %s for user_id=%s", job_id, user_id)
        export_jobs[job_id]["status"] = "failed"
        export_jobs[job_id]["error"] = str(exc)


@router.post("/{user_id}/export", status_code=status.HTTP_202_ACCEPTED)
async def start_user_export(
    user_id: str,
    format: ExportFormat = ExportFormat.json,
    background_tasks: BackgroundTasks = Depends(),
    current_user=Depends(get_current_user),
):
    """
    Start an asynchronous export job for the user.

    Returns immediately with a job_id that can be polled for status and used
    to download the completed export once ready.
    """
    if current_user.user.id != user_id:
        logger.warning(
            "Unauthorized export start attempt. User %s tried to export %s",
            current_user.user.id,
            user_id,
        )
        raise HTTPException(status_code=403, detail="Not authorized to export this user's data")

    job_id = f"{user_id}-{datetime.now(timezone.utc).timestamp()}"
    export_jobs[job_id] = {
        "status": "pending",
        "user_id": user_id,
        "format": format,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "error": None,
    }

    background_tasks.add_task(_run_export_job, user_id, format, job_id)
    logger.info("Queued export job %s for user_id=%s", job_id, user_id)

    return {"job_id": job_id, "status": "pending"}


@router.get("/{user_id}/export/{job_id}/status")
async def get_export_status(
    user_id: str,
    job_id: str,
    current_user=Depends(get_current_user),
):
    """
    Check the status of an export job.
    """
    if current_user.user.id != user_id:
        logger.warning(
            "Unauthorized export status attempt. User %s tried to check %s",
            current_user.user.id,
            user_id,
        )
        raise HTTPException(status_code=403, detail="Not authorized to check this export")

    job = export_jobs.get(job_id)
    if not job or job.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Export job not found")

    return {
        "job_id": job_id,
        "status": job["status"],
        "format": job.get("format"),
        "created_at": job.get("created_at"),
        "completed_at": job.get("completed_at"),
        "error": job.get("error"),
    }


@router.get("/{user_id}/export/{job_id}/download")
async def download_user_export(
    user_id: str,
    job_id: str,
    current_user=Depends(get_current_user),
):
    """
    Download the result of a completed export job.
    """
    if current_user.user.id != user_id:
        logger.warning(
            "Unauthorized export download attempt. User %s tried to download %s",
            current_user.user.id,
            user_id,
        )
        raise HTTPException(status_code=403, detail="Not authorized to download this export")

    job = export_jobs.get(job_id)
    if not job or job.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Export job not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail=f"Export job not completed: {job['status']}")

    file_path = job.get("file_path")
    if not file_path or not Path(file_path).is_file():
        raise HTTPException(status_code=410, detail="Export file no longer available")

    return FileResponse(
        path=file_path,
        media_type=job.get("media_type") or "application/octet-stream",
        filename=job.get("filename") or Path(file_path).name,
    )


@router.get("/{user_id}/export")
def download_user_data(
    user_id: str,
    format: ExportFormat = ExportFormat.json,
    current_user=Depends(get_current_user),
):
    """
    Synchronous export endpoint kept for compatibility.
    Prefer the asynchronous export workflow instead.
    """
    if current_user.user.id != user_id:
        logger.warning(
            "Unauthorized export attempt. User %s tried to export %s",
            current_user.user.id,
            user_id,
        )
        raise HTTPException(status_code=403, detail="Not authorized to export this user's data")

    try:
        payload = _fetch_user_export_data(user_id)
        content, media_type, filename = _render_export_content(user_id, format, payload)
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to export data for user_id: %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to export user data") from e

