"""JWT authentication for Supabase users."""
import os
import logging
from dataclasses import dataclass
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Cache for JWK clients to avoid refetching on every request
# Key is the Supabase URL
_jwk_clients: dict[str, PyJWKClient] = {}


@dataclass
class AuthenticatedUser:
    """Represents a verified Supabase user."""
    id: str  # UUID from JWT "sub" claim


def _get_jwt_secret() -> Optional[str]:
    """Get the Supabase JWT secret from environment."""
    return os.environ.get("SUPABASE_JWT_SECRET")


def _get_supabase_url() -> str:
    """Get the Supabase URL from environment."""
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    if not url:
        raise RuntimeError("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set")
    return url


def _get_jwks_url() -> str:
    """Construct the JWKS URL for the Supabase project."""
    base_url = _get_supabase_url().rstrip("/")
    return f"{base_url}/auth/v1/.well-known/jwks.json"


def _get_jwk_client() -> PyJWKClient:
    """Get or create a JWK client for the current Supabase project."""
    url = _get_jwks_url()
    if url not in _jwk_clients:
        # Cache keys for 5 minutes (300 seconds) to handle rotation seamlessly
        _jwk_clients[url] = PyJWKClient(url, cache_keys=True, cache_jwk_set=True, lifespan=300)
    return _jwk_clients[url]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    """FastAPI dependency that verifies the Supabase JWT and returns the user.

    Supports both symmetric (HS256) and asymmetric (RS256/ES256) tokens.
    """
    token = credentials.credentials

    try:
        # 1. Inspect the token header to determine the algorithm
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")

        if alg == "HS256":
            # Use symmetric secret
            secret = _get_jwt_secret()
            if not secret:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server configuration error: HS256 secret missing"
                )
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"require": ["sub", "exp"]},
            )
        else:
            # Use asymmetric JWKS (RS256, ES256, etc.)
            jwk_client = _get_jwk_client()
            try:
                signing_key = jwk_client.get_signing_key_from_jwt(token)
            except jwt.exceptions.PyJWKClientError:
                # If key not found, clear the cache and try exactly once more
                # This handles key rotation gracefully if the cache is stale
                fallback_url = _get_jwks_url()
                if fallback_url in _jwk_clients:
                    del _jwk_clients[fallback_url]
                jwk_client = _get_jwk_client()
                signing_key = jwk_client.get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                options={"require": ["sub", "exp"]},
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invaid token attempt: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        logger.exception("Unexpected error during JWT validation")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    return AuthenticatedUser(id=user_id)
