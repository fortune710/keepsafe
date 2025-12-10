from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from services.supabase_client import get_supabase_client

auth_scheme = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Dependency to get the current authenticated user from Supabase.
    Validates the Bearer token and returns the user object.
    """
    try:
        # Get the user using the token
        user_response = supabase.auth.get_user(token.credentials)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user_response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
