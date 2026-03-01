from fastapi.testclient import TestClient
from note_taker.api.main import app

client = TestClient(app)

def test_root_redirect():
    # Test HEAD request
    head_response = client.head("/", follow_redirects=False)
    assert head_response.status_code == 307
    assert head_response.headers["location"] == "/health"

    # Test GET request
    get_response = client.get("/", follow_redirects=False)
    assert get_response.status_code == 307
    assert get_response.headers["location"] == "/health"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
