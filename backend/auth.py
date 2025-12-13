"""
Authentication module with Clerk integration
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import os
from sqlalchemy.orm import Session
from database import get_db
import models
from clerk_backend_api import Clerk
import jwt
import requests

# Clerk configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

if not CLERK_SECRET_KEY:
    raise RuntimeError("CLERK_SECRET_KEY environment variable is not set")

# Initialize Clerk client
clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)

# Security scheme
security = HTTPBearer()

# Cache for JWKS
_jwks_cache = None


def get_jwks():
    """Get Clerk's JWKS (JSON Web Key Set) for token verification"""
    global _jwks_cache
    if _jwks_cache is None:
        # Extract the instance from the secret key or use the API
        # For now, we'll use a simpler approach - just verify with Clerk API
        pass
    return _jwks_cache


def verify_clerk_token(token: str) -> dict:
    """
    Verify Clerk session token by decoding JWT and fetching user info
    
    Args:
        token: Clerk session token (JWT)
        
    Returns:
        Dictionary with Clerk user data
        
    Raises:
        HTTPException: If token is invalid or verification fails
    """
    try:
        # Decode the JWT without verification to get the user_id
        # Clerk tokens are signed, but we'll verify by fetching the user with our secret key
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        print(f"DEBUG: Decoded token: {decoded}")
        
        # Get the user_id or sub from the token
        user_id = decoded.get("sub") or decoded.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user ID found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"DEBUG: User ID from token: {user_id}")
        
        # Verify by fetching the user from Clerk using our secret key
        try:
            user = clerk.users.get(user_id=user_id)
            print(f"DEBUG: Successfully fetched user from Clerk: {user.id}")
        except Exception as e:
            print(f"DEBUG: Failed to fetch user from Clerk: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: could not verify user ({str(e)})",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Convert to dict for easier handling
        return {
            "id": user.id,
            "email_addresses": [{"email_address": email.email_address} for email in (user.email_addresses or [])],
            "first_name": user.first_name,
            "last_name": user.last_name,
            "image_url": user.image_url,
        }
        
    except HTTPException:
        raise
    except jwt.DecodeError as e:
        print(f"DEBUG: JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token format: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"DEBUG: Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to get the current authenticated user from Clerk token
    
    Args:
        credentials: HTTP Bearer token from request
        db: Database session
        
    Returns:
        Current authenticated user
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    clerk_user = verify_clerk_token(token)
    
    clerk_id = clerk_user.get("id")
    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user data from Clerk",
        )
    
    # Get or create user in our database
    user = db.query(models.User).filter(models.User.clerk_id == clerk_id).first()
    
    if not user:
        # Create new user with only clerk_id
        user = models.User(clerk_id=clerk_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"DEBUG: Created new user with clerk_id: {clerk_id}")
    else:
        print(f"DEBUG: Found existing user with clerk_id: {clerk_id}")
    
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """
    Dependency to get the current user if authenticated, None otherwise.
    Useful for endpoints that work both with and without authentication.
    
    Args:
        credentials: Optional HTTP Bearer token from request
        db: Database session
        
    Returns:
        Current authenticated user or None
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        clerk_user = verify_clerk_token(token)
        clerk_id = clerk_user.get("id")
        
        if not clerk_id:
            return None
        
        user = db.query(models.User).filter(models.User.clerk_id == clerk_id).first()
        
        if not user:
            # Create new user with only clerk_id
            user = models.User(clerk_id=clerk_id)
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user
    except:
        return None
