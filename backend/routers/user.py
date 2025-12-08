import logging
from fastapi import APIRouter, HTTPException
from services.pinecone_client import get_pinecone_index
from services.supabase_client import get_supabase_client

router = APIRouter(prefix="/user", tags=["user"])
logger = logging.getLogger(__name__)

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """
    Delete a user's account and all associated data.
    This includes:
    1. Deleting all vectors from Pinecone with the matching user_id metadata.
    2. Deleting the user from Supabase Auth (which cascades to public tables if configured).
    """
    logger.info(f"Initiating account deletion for user_id: {user_id}")
    
    try:
        # 1. Delete from Pinecone
        try:
            index = get_pinecone_index()
            # Delete vectors where metadata['user_id'] matches
            # Note: delete by metadata filter is supported in Pinecone
            index.delete(filter={"user_id": user_id})
            logger.info(f"Deleted Pinecone vectors for user_id: {user_id}")
        except Exception as e:
            logger.error(f"Failed to delete Pinecone vectors: {e}")
            # We continue even if Pinecone fails, as we want to ensure the account is deleted
            # But we should probably log this as a critical error
            pass

        # 2. Delete from Supabase
        supabase = get_supabase_client()
        
        # 2a. Delete from public.profiles explicitly first
        # We do this first to ensure application data is removed even if Auth delete fails
        try:
            supabase.table("profiles").delete().eq("id", user_id).execute()
            logger.info(f"Deleted user profile from public.profiles: {user_id}")
        except Exception as db_error:
            logger.error(f"Failed to delete user profile: {db_error}")
            raise HTTPException(status_code=500, detail=f"Failed to delete user data: {str(db_error)}")

        # 2b. Try to delete from Auth (requires service role usually)
        try:
            # Attempt to delete the user from the Auth system
            supabase.auth.admin.delete_user(user_id)
            logger.info(f"Deleted user from Supabase Auth: {user_id}")
        except Exception as auth_error:
            # If auth delete fails (e.g. permission), we just log it since we already cleaned up data
            logger.warning(f"Failed to delete from Supabase Auth (likely permission issue): {auth_error}")

        return {"message": "Account deletion processed", "user_id": user_id}

    except Exception as e:
        logger.error(f"Error during account deletion: {e}")
        raise HTTPException(status_code=500, detail=str(e))
