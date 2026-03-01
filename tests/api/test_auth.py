"""Tests for JWT authentication dependency."""
import jwt
import time
import pytest
from unittest.mock import patch
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from note_taker.api.auth import get_current_user, AuthenticatedUser

# Test JWT secret (must match what the auth module reads)
TEST_JWT_SECRET = "test-super-secret-jwt-token-with-at-least-32-characters"


def _make_token(payload: dict, secret: str = TEST_JWT_SECRET) -> str:
    """Create a test JWT."""
    return jwt.encode(payload, secret, algorithm="HS256")


def _make_valid_token(user_id: str = "user-123") -> str:
    """Create a valid JWT with proper claims."""
    return _make_token({
        "sub": user_id,
        "role": "authenticated",
        "exp": int(time.time()) + 3600,
        "iss": "https://test.supabase.co/auth/v1",
    })


@pytest.fixture
def auth_app():
    """Create a minimal FastAPI app with the auth dependency."""
    app = FastAPI()

    @app.get("/protected")
    def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
        return {"user_id": user.id}

    return TestClient(app)


@patch.dict("os.environ", {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET})
def test_valid_token_returns_user(auth_app):
    """A valid JWT should return the authenticated user."""
    token = _make_valid_token("user-abc-123")
    response = auth_app.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["user_id"] == "user-abc-123"


@patch.dict("os.environ", {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET})
def test_missing_auth_header(auth_app):
    """Missing Authorization header should return 401."""
    response = auth_app.get("/protected")
    assert response.status_code == 401


@patch.dict("os.environ", {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET})
def test_invalid_token(auth_app):
    """An invalid JWT should return 401."""
    response = auth_app.get(
        "/protected",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert response.status_code == 401


@patch.dict("os.environ", {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET})
def test_expired_token(auth_app):
    """An expired JWT should return 401."""
    token = _make_token({
        "sub": "user-123",
        "role": "authenticated",
        "exp": int(time.time()) - 3600,  # expired 1h ago
    })
    response = auth_app.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


@patch.dict("os.environ", {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET})
def test_token_missing_sub_claim(auth_app):
    """A JWT without a "sub" claim should return 401."""
    token = _make_token({
        "role": "authenticated",
        "exp": int(time.time()) + 3600,
    })
    response = auth_app.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
