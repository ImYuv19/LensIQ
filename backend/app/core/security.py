import logging
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, status, Header, Depends
from backend.app.config import settings

logger = logging.getLogger(__name__)

class AuthenticatedUser:
    def __init__(self, user_id: str, email: str, role: str = "authenticated"):
        self.id = user_id
        self.email = email
        self.role = role

def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies a Supabase JWT token.
    Falls back to development mock if mock mode or configured for local testing.
    """
    if settings.MOCK_FALLBACK_MODE or not settings.SUPABASE_JWT_SECRET:
        # Development fallback token handler
        try:
            # Try decoding without verification for development inspections if no secret
            unverified = jwt.decode(token, options={"verify_signature": False})
            return unverified
        except Exception:
            return {"sub": "00000000-0000-0000-0000-000000000001", "email": "alex.morgan@lensiq.ai", "role": "authenticated"}

    try:
        # Supabase uses HS256 with SUPABASE_JWT_SECRET
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and validates the authenticated Supabase user.
    """
    if not authorization:
        if settings.DEBUG or settings.MOCK_FALLBACK_MODE:
            # Allow fallback default dev user during testing
            return AuthenticatedUser(
                user_id="00000000-0000-0000-0000-000000000001",
                email="alex.morgan@lensiq.ai"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be in the format 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    claims = decode_supabase_jwt(token)
    user_id = claims.get("sub")
    email = claims.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity ('sub').",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(user_id=user_id, email=email, role=claims.get("role", "authenticated"))

