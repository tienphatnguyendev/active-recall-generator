# Configure CORS for Python Backend (SOLO-144) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strictly enforce a comma-separated list of origins for CORS in the FastAPI backend, forbidding wildcards and ensuring a safe local development fallback.

**Architecture:** 
- Update `src/note_taker/api/main.py` with enhanced parsing and validation logic for `CORS_ORIGINS`.
- Document the configuration in `.env.example`.
- Add comprehensive CORS testing in `tests/api/test_cors.py`.

**Tech Stack:** FastAPI, Python, Pytest, `unittest.mock`.

---

### Task 1: Create CORS Tests (RED)

**Files:**
- Create: `tests/api/test_cors.py`

**Step 1: Write the failing tests**

```python
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
    # To test dynamic changes, we might need to reload or re-initialize the app, 
    # but for this task, we will verify the validation logic directly if possible,
    # or rely on the fact that we will fix the logic in Task 2.
    from importlib import reload
    import note_taker.api.main
    reload(note_taker.api.main)
    client = TestClient(note_taker.api.main.app)
    
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
    client = TestClient(note_taker.api.main.app)
    
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
    assert response.headers.get("access-control-allow-origin") is None # since origin doesn't match default
```

**Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/api/test_cors.py -v`
Expected: FAIL (The wildcard test specifically should fail because current implementation allows it if set in ENV).

**Step 3: Commit**

```bash
git add tests/api/test_cors.py
git commit -m "test: add CORS validation test cases"
```

---

### Task 2: Implement Enhanced CORS Validation (GREEN)

**Files:**
- Modify: `src/note_taker/api/main.py`

**Step 1: Implement minimal implementation**

Replace the current CORS setup logic with:

```python
# Configure CORS for Next.js frontend
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
raw_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

# Filter out wildcards and ensure valid protocols
validated_origins = []
for origin in raw_origins:
    if origin == "*":
        continue
    if origin.startswith(("http://", "https://")):
        validated_origins.append(origin)

# Fallback if no valid origins found
if not validated_origins:
    validated_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=validated_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Step 2: Run tests to verify they pass**

Run: `.venv/bin/pytest tests/api/test_cors.py -v`
Expected: PASS

**Step 3: Commit**

```bash
git add src/note_taker/api/main.py
git commit -m "feat: implement strict CORS origin validation"
```

---

### Task 3: Update Environment Documentation

**Files:**
- Modify: `.env.example`

**Step 1: Document `CORS_ORIGINS`**

```text
# ... existing content ...
# CORS Authorized Origins (comma-separated, no wildcards allowed)
# Examples:
# CORS_ORIGINS=http://localhost:3000
# CORS_ORIGINS=https://your-production-app.vercel.app,http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

**Step 2: Verify documentation**

Check that `.env.example` is clear and matches the implementation.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: document CORS_ORIGINS in .env.example"
```

---

### Task 4: Final Verification

**Step 1: Run all API tests**

Run: `.venv/bin/pytest tests/api/ -v`
Expected: ALL PASS

**Step 2: Cleanup and Finish**

Follow the `finishing-a-development-branch` skill.
