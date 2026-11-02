import logging
import datetime
from typing import Optional, Dict, Any, List
import bcrypt
import jwt
from jwt import (
    PyJWKClient,
    PyJWKClientError,
    InvalidTokenError,
    ExpiredSignatureError,
    InvalidAudienceError,
    InvalidIssuerError,
    InvalidAlgorithmError,
)
from fastapi import HTTPException, status, Header, Depends
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Explicitly allowed signing algorithms
ALLOWED_ASYMMETRIC_ALGORITHMS: List[str] = ["ES256", "RS256"]
ALLOWED_SYMMETRIC_ALGORITHMS: List[str] = ["HS256"]

class AuthenticatedUser:
    def __init__(self, user_id: str, email: str, role: str = "authenticated"):
        self.id = user_id
        self.email = email
        self.role = role

# Global cached JWK Client instance
_jwks_client: Optional[PyJWKClient] = None

def get_jwks_url() -> Optional[str]:
    """Derives the public JWKS URL from configured SUPABASE_URL."""
    if settings.SUPABASE_URL:
        return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return None

def get_expected_issuer() -> Optional[str]:
    """Derives expected token issuer from SUPABASE_URL."""
    if settings.SUPABASE_URL:
        return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
    return None

def get_jwks_client() -> Optional[PyJWKClient]:
    """Returns or initializes the cached PyJWKClient with 1-hour key caching."""
    global _jwks_client
    if _jwks_client is None:
        jwks_url = get_jwks_url()
        if jwks_url:
            _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client

def set_jwks_client(client: Optional[PyJWKClient]):
    """Allows test fixtures to inject custom or mocked JWK clients."""
    global _jwks_client
    _jwks_client = client

def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and cryptographically verifies a Supabase JWT token.
    Supports ES256/RS256 asymmetric signing keys via JWKS and legacy HS256 if configured.
    Never accepts unverified tokens.
    """
    # 1. Explicit local development token bypass for isolated testing
    if (settings.DEBUG or settings.MOCK_FALLBACK_MODE) and token == "mock-dev-token":
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "alex.morgan@lensiq.ai",
            "role": "authenticated"
        }

    # 2. Extract and inspect unverified header
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        logger.warning(f"Malformed JWT header: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = unverified_header.get("alg")
    if not alg:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header missing algorithm ('alg').",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Handle Asymmetric Keys (ES256, RS256) via JWKS
    if alg in ALLOWED_ASYMMETRIC_ALGORITHMS:
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token header missing key identifier ('kid').",
                headers={"WWW-Authenticate": "Bearer"},
            )

        jwks = get_jwks_client()
        if not jwks:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase URL is not configured for JWKS verification."
            )

        try:
            signing_key = jwks.get_signing_key_from_jwt(token)
        except PyJWKClientError as e:
            logger.warning(f"Signing key lookup failed for kid '{kid}': {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Signing key not found or expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        expected_issuer = get_expected_issuer()

        try:
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                issuer=expected_issuer,
                options={"verify_aud": True, "verify_iss": bool(expected_issuer)}
            )
            return payload
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidAudienceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience. Expected 'authenticated'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidIssuerError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token issuer.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidAlgorithmError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token algorithm mismatch.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidTokenError as e:
            logger.warning(f"Invalid asymmetric JWT token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {e}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 4. Handle Legacy Symmetric Key (HS256) if explicitly configured
    elif alg in ALLOWED_SYMMETRIC_ALGORITHMS:
        if not settings.SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="HS256 tokens are rejected because no legacy symmetric secret is configured.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
            return payload
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except InvalidTokenError as e:
            logger.warning(f"Invalid symmetric JWT token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 5. Reject any unrecognized or untrusted algorithm
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported or untrusted JWT algorithm: '{alg}'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def hash_password(password: str) -> str:
    """Hashes a password with bcrypt and a random salt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(
    user_id: str,
    email: str,
    role: str = "authenticated",
    expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """Creates a local signed JWT access token."""
    expire = datetime.datetime.now(datetime.timezone.utc) + (
        expires_delta or datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "aud": "authenticated",
        "exp": expire,
        "iat": datetime.datetime.now(datetime.timezone.utc)
    }
    return jwt.encode(payload, settings.LOCAL_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes a JWT token. First tests local HMAC-SHA256 signature,
    and falls back to Supabase JWKS/asymmetric verification if configured.
    """
    # 1. Dev bypass token
    if (settings.DEBUG or settings.MOCK_FALLBACK_MODE) and token == "mock-dev-token":
        return {
            "sub": "00000000-0000-0000-0000-000000000001",
            "email": "alex.morgan@lensiq.ai",
            "role": "authenticated"
        }

    # 2. Try decoding with local JWT secret first
    try:
        payload = jwt.decode(
            token,
            settings.LOCAL_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated"
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        pass

    # 3. Fallback to Supabase JWT verification
    return decode_supabase_jwt(token)

def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and validates the authenticated user from the Bearer token.
    """
    if not authorization:
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
    claims = decode_token(token)
    user_id = claims.get("sub")
    email = claims.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity ('sub').",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(user_id=user_id, email=email, role=claims.get("role", "authenticated"))
