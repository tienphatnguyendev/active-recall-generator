import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from note_taker.api.main import app

def test_cors_default_origin_success():
    client = TestClient(app)
    # Default origin should be http://localhost:3000
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

def test_cors_unauthorized_origin_failure():
    client = TestClient(app)
    response = client.options(
        "/health",
        headers={
            "Origin": "http://malicious.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # If unauthorized, the header should be absent or not match
    assert response.headers.get("access-control-allow-origin") is None

@patch.dict(os.environ, {"CORS_ORIGINS": "https://myapp.com, http://another.com"})
def test_cors_custom_origins_success():
    # Note: Middleware is configured at import time in main.py. 
    # To test dynamic changes, we might need to reload or re-initialize the app
    from importlib import reload
    import note_taker.api.main
    reload(note_taker.api.main)
    from note_taker.api.main import app as reloaded_app
    client = TestClient(reloaded_app)
    
    for origin in ["https://myapp.com", "http://another.com"]:
        response = client.options(
            "/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == origin

@patch.dict(os.environ, {"CORS_ORIGINS": "*"})
def test_cors_wildcard_forbidden():
    from importlib import reload
    import note_taker.api.main
    reload(note_taker.api.main)
    from note_taker.api.main import app as reloaded_app
    client = TestClient(reloaded_app)
    
    response = client.options(
        "/health",
        headers={
            "Origin": "http://anywhere.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Wildcard in ENV should result in fallback, NOT allowing everything
    assert response.headers.get("access-control-allow-origin") != "*"
    # Should fallback to default http://localhost:3000
    # Current implementation will FAIL this test because it passes ["*"] which CORSMiddleware translates to allow all origins
    assert response.headers.get("access-control-allow-origin") is None # since origin doesn't match default
