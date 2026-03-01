# Secure FastAPI Endpoint & Save to Supabase — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Secure the `POST /api/generate` endpoint with Supabase JWT verification, then insert the final generated Artifact and Cards directly into the Supabase database (via the `supabase-py` admin client) on behalf of the authenticated user.

**Architecture:** We will create auth middleware that extracts and verifies the Supabase JWT from the `Authorization: Bearer <token>` header. The verified `user_id` is injected into the request context via a FastAPI dependency. After the pipeline completes, the `save_to_db_node` is replaced (for the API path only) with a Supabase insert that writes to `public.artifacts` and `public.cards` using the service role key. Error handling covers invalid JWTs (401), rate limits (429), and pipeline failures (500 via SSE error events).

**Tech Stack:** FastAPI, `supabase-py`, `PyJWT`, `python-dotenv`

**Linear Issue:** [SOLO-103](https://linear.app/aaron-solo/issue/SOLO-103/secure-fastapi-endpoint-and-save-to-supabase)

**Depends On:** [SOLO-102](https://linear.app/aaron-solo/issue/SOLO-102/expose-langgraph-pipeline-as-sse-endpoint) (the generate endpoint must exist first)

**Estimated Total Time:** ~3–4 hours

---

## Background & Key Context

### Supabase Schema (from `supabase/migrations/20260227152105_init_schema.sql`)

```sql
-- public.artifacts
CREATE TABLE public.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    outline JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- public.cards
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_context TEXT NOT NULL,
    judge_score FLOAT,
    judge_feedback TEXT,
    -- FSRS fields with defaults ...
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

RLS is enabled on both tables — INSERTs require `auth.uid() = user_id`. The backend will use the **service role key** to bypass RLS and insert on behalf of the user.

### Environment Variables (from `render.yaml`)

```yaml
envVars:
  - key: SUPABASE_URL
  - key: SUPABASE_SERVICE_ROLE_KEY
  - key: GROQ_API_KEY
```

The Next.js frontend stores `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. The backend needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already configured in Render).

### JWT Structure

Supabase JWTs contain:
```json
{
  "sub": "user-uuid-here",
  "role": "authenticated",
  "iss": "https://<project>.supabase.co/auth/v1",
  "exp": 1234567890
}
```

The `sub` field is the `user_id` in the `public.users` table.

---

## Task 1: Add `PyJWT` Dependency (~5 min)

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add the dependency**

Add `PyJWT` to the `dependencies` list in `pyproject.toml`:

```toml
dependencies = [
    # ... existing deps ...
    "pyjwt[crypto]>=2.8.0",
]
```

> The `[crypto]` extra includes `cryptography` for RS256 verification, but Supabase uses HS256 by default with the JWT secret. We include it for future compatibility.

**Step 2: Install**

Run: `uv pip install -e .`
Expected: Successfully installs `pyjwt`.

**Step 3: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "build: add pyjwt dependency for JWT verification"
```

---

## Task 2: Create Supabase Client Module (~15 min)

**Files:**
- Create: `src/note_taker/api/supabase_client.py`
- Modify: `src/note_taker/api/main.py`

**Step 1: Create the Supabase client singleton**

File: `src/note_taker/api/supabase_client.py`

```python
"""Supabase admin client for server-side operations."""
import os
import logging

from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase_client() -> Client:
    """Get or create the Supabase admin client (service role)."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
        _client = create_client(url, key)
        logger.info("Supabase admin client initialized")
    return _client


def reset_client() -> None:
    """Reset the client (for testing)."""
    global _client
    _client = None
```

**Step 2: Load `.env` at startup**

Modify `src/note_taker/api/main.py` — add at the very top (before other imports):

```python
from dotenv import load_dotenv
load_dotenv()  # Load .env for local development
```

**Step 3: Commit**

```bash
git add src/note_taker/api/supabase_client.py src/note_taker/api/main.py
git commit -m "feat: add Supabase admin client module"
```

---

## Task 3: Implement JWT Auth Dependency (~25 min)

**Files:**
- Create: `src/note_taker/api/auth.py`
- Create: `tests/api/test_auth.py`

**Step 1: Write the failing tests**

File: `tests/api/test_auth.py`

```python
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
    """A JWT without a 'sub' claim should return 401."""
    token = _make_token({
        "role": "authenticated",
        "exp": int(time.time()) + 3600,
    })
    response = auth_app.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/api/test_auth.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'note_taker.api.auth'`

**Step 3: Implement the auth module**

File: `src/note_taker/api/auth.py`

```python
"""JWT authentication for Supabase users."""
import os
import logging
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

security = HTTPBearer()


@dataclass
class AuthenticatedUser:
    """Represents a verified Supabase user."""
    id: str  # UUID from JWT 'sub' claim


def _get_jwt_secret() -> str:
    """Get the Supabase JWT secret from environment."""
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        raise RuntimeError("SUPABASE_JWT_SECRET must be set")
    return secret


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    """FastAPI dependency that verifies the Supabase JWT and returns the user.

    Raises HTTPException 401 if the token is missing, invalid, or expired.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    return AuthenticatedUser(id=user_id)
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/api/test_auth.py -v`
Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add src/note_taker/api/auth.py tests/api/test_auth.py
git commit -m "feat(auth): add JWT verification dependency for Supabase"
```

---

## Task 4: Add Supabase Persistence Logic (~25 min)

**Files:**
- Create: `src/note_taker/api/persistence.py`
- Create: `tests/api/test_persistence.py`

**Step 1: Write the failing tests**

File: `tests/api/test_persistence.py`

```python
"""Tests for Supabase persistence logic."""
import pytest
from unittest.mock import MagicMock, patch
from note_taker.api.persistence import save_artifact_to_supabase
from note_taker.models import (
    FinalArtifactV1, OutlineItem, QuestionAnswerPair,
)


@pytest.fixture
def sample_artifact():
    return FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="Intro", level=1)],
        qa_pairs=[
            QuestionAnswerPair(
                question="What are agents?",
                answer="Autonomous systems.",
                source_context="Agents are systems...",
                judge_score=0.9,
                judge_feedback="Good.",
            ),
            QuestionAnswerPair(
                question="What is reasoning?",
                answer="Logical thinking.",
                source_context="Reasoning is...",
                judge_score=0.85,
                judge_feedback="Clear.",
            ),
        ],
    )


def test_save_artifact_inserts_artifact_and_cards(sample_artifact):
    """save_artifact_to_supabase should insert into artifacts then cards."""
    mock_client = MagicMock()

    # Mock the artifacts insert to return an ID
    mock_artifact_response = MagicMock()
    mock_artifact_response.data = [{"id": "artifact-uuid-123"}]
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_artifact_response
    )

    result = save_artifact_to_supabase(
        client=mock_client,
        user_id="user-uuid-456",
        title="Test Chapter",
        artifact=sample_artifact,
    )

    # Check artifacts table was called
    calls = mock_client.table.call_args_list
    table_names = [c[0][0] for c in calls]
    assert "artifacts" in table_names
    assert "cards" in table_names

    # Verify the returned artifact ID
    assert result == "artifact-uuid-123"


def test_save_artifact_maps_cards_correctly(sample_artifact):
    """Each QA pair should map to a card row with correct fields."""
    mock_client = MagicMock()

    mock_artifact_response = MagicMock()
    mock_artifact_response.data = [{"id": "art-id"}]

    mock_cards_response = MagicMock()
    mock_cards_response.data = [{"id": "card-1"}, {"id": "card-2"}]

    # First call = artifacts, second call = cards
    mock_client.table.return_value.insert.return_value.execute.side_effect = [
        mock_artifact_response,
        mock_cards_response,
    ]

    save_artifact_to_supabase(
        client=mock_client,
        user_id="user-id",
        title="Title",
        artifact=sample_artifact,
    )

    # Get the cards insert call
    insert_calls = mock_client.table.return_value.insert.call_args_list
    # Second insert call should be for the cards
    cards_data = insert_calls[1][0][0]
    assert len(cards_data) == 2
    assert cards_data[0]["question"] == "What are agents?"
    assert cards_data[0]["artifact_id"] == "art-id"
    assert cards_data[1]["judge_score"] == 0.85
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/api/test_persistence.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Implement the persistence module**

File: `src/note_taker/api/persistence.py`

```python
"""Save pipeline artifacts to Supabase."""
import json
import logging
from typing import Any

from supabase import Client
from note_taker.models import FinalArtifactV1

logger = logging.getLogger(__name__)


def save_artifact_to_supabase(
    client: Client,
    user_id: str,
    title: str,
    artifact: FinalArtifactV1,
) -> str:
    """Insert a FinalArtifactV1 into Supabase as an artifact + cards.

    Args:
        client: Supabase admin client (service role).
        user_id: The authenticated user's UUID.
        title: Title for the artifact.
        artifact: The pipeline-generated artifact.

    Returns:
        The UUID of the newly created artifact row.

    Raises:
        Exception: If the Supabase insert fails.
    """
    # 1) Insert artifact
    outline_json = [item.model_dump() for item in artifact.outline]
    artifact_row = {
        "user_id": user_id,
        "title": title,
        "source_hash": artifact.source_hash,
        "outline": outline_json,
    }

    artifact_response = (
        client.table("artifacts").insert(artifact_row).execute()
    )
    artifact_id = artifact_response.data[0]["id"]
    logger.info(f"Created artifact {artifact_id} for user {user_id}")

    # 2) Insert cards
    card_rows = [
        {
            "artifact_id": artifact_id,
            "question": qa.question,
            "answer": qa.answer,
            "source_context": qa.source_context,
            "judge_score": qa.judge_score,
            "judge_feedback": qa.judge_feedback,
        }
        for qa in artifact.qa_pairs
    ]

    if card_rows:
        client.table("cards").insert(card_rows).execute()
        logger.info(f"Created {len(card_rows)} cards for artifact {artifact_id}")

    return artifact_id
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/api/test_persistence.py -v`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/note_taker/api/persistence.py tests/api/test_persistence.py
git commit -m "feat(persistence): add Supabase save logic for artifacts and cards"
```

---

## Task 5: Wire Auth + Persistence into the Generate Endpoint (~25 min)

**Files:**
- Modify: `src/note_taker/api/generate.py`
- Modify: `tests/api/test_generate.py`

This is the integration task — it ties SOLO-102's SSE endpoint together with auth (Task 3) and persistence (Task 4).

**Step 1: Update the generate route to require auth**

Modify `src/note_taker/api/generate.py`. The key changes:

1. Add `get_current_user` dependency to the endpoint.
2. After the pipeline completes, call `save_artifact_to_supabase`.
3. Emit an SSE event for the "saving to Supabase" stage.

```python
"""SSE streaming endpoint for the LangGraph pipeline (secured)."""
import json
import hashlib
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from note_taker.api.schemas import GenerateRequest, SSEStageEvent, SSEErrorEvent
from note_taker.api.auth import get_current_user, AuthenticatedUser
from note_taker.api.persistence import save_artifact_to_supabase
from note_taker.api.supabase_client import get_supabase_client
from note_taker.pipeline.graph import build_graph

logger = logging.getLogger(__name__)

router = APIRouter()

NODE_TO_STAGE = {
    "check_database_node": "check",
    "outline_draft_node": "outline_draft",
    "qa_draft_node": "qa_draft",
    "judge_node": "judge",
    "revise_node": "revise",
    "save_to_db_node": "save",
}


# ... (_serialize_node_output, _artifact_to_dict — unchanged from SOLO-102) ...


async def _generate_events(
    request: GenerateRequest,
    user: AuthenticatedUser,
) -> AsyncGenerator[dict, None]:
    """Run the pipeline and yield SSE events, then save to Supabase."""
    # ... (same pipeline streaming logic as SOLO-102) ...
    
    # ADDITION: After the pipeline yield loop, save to Supabase
    try:
        if last_artifact:
            # Emit saving stage
            yield {
                "event": "stage_update",
                "data": SSEStageEvent(
                    stage="saving_to_supabase",
                    status="started",
                    data=None,
                ).model_dump_json(),
            }

            supabase = get_supabase_client()
            artifact_id = save_artifact_to_supabase(
                client=supabase,
                user_id=user.id,
                title=request.title,
                artifact=last_artifact,
            )

            yield {
                "event": "stage_update",
                "data": SSEStageEvent(
                    stage="saving_to_supabase",
                    status="completed",
                    data={"artifact_id": artifact_id},
                ).model_dump_json(),
            }

            yield {
                "event": "complete",
                "data": json.dumps({
                    "artifact": _artifact_to_dict(last_artifact),
                    "artifact_id": artifact_id,
                }),
            }
    except Exception as e:
        logger.exception("Supabase save error")
        yield {
            "event": "error",
            "data": SSEErrorEvent(
                message=f"Failed to save to database: {str(e)}"
            ).model_dump_json(),
        }


@router.post("/api/generate")
async def generate(
    request: GenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Stream pipeline progress as SSE (authenticated)."""
    return EventSourceResponse(_generate_events(request, user))
```

**Step 2: Update tests to include auth headers**

Modify `tests/api/test_generate.py` — all test requests must now include a JWT. Add a fixture and patch the auth dependency:

```python
# Add at the top of the file:
from note_taker.api.auth import get_current_user, AuthenticatedUser

# Add fixture:
@pytest.fixture(autouse=True)
def override_auth():
    """Skip real JWT verification in generate tests."""
    mock_user = AuthenticatedUser(id="test-user-uuid")
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()
```

Also add a test specifically for unauthenticated access:

```python
def test_generate_rejects_unauthenticated():
    """POST /api/generate without auth should return 401 (when no override)."""
    app.dependency_overrides.clear()  # Remove the autouse override
    response = client.post(
        "/api/generate",
        json={"markdown": SAMPLE_MARKDOWN, "title": "Test"},
    )
    assert response.status_code in (401, 403)
```

**Step 3: Run tests**

Run: `pytest tests/api/ -v`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/note_taker/api/generate.py tests/api/test_generate.py
git commit -m "feat(api): wire JWT auth + Supabase persistence into generate endpoint"
```

---

## Task 6: Add Environment Variable Documentation & Config (~10 min)

**Files:**
- Modify: `render.yaml`
- Create: `.env.example`

**Step 1: Update `render.yaml`**

Add the `SUPABASE_JWT_SECRET` env var:

```yaml
envVars:
  - key: SUPABASE_URL
    sync: false
  - key: SUPABASE_SERVICE_ROLE_KEY
    sync: false
  - key: SUPABASE_JWT_SECRET
    sync: false
  - key: GROQ_API_KEY
    sync: false
```

**Step 2: Create `.env.example`**

```bash
# Supabase (backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# LLM Providers
GROQ_API_KEY=your-groq-key
CEREBRAS_API_KEY=your-cerebras-key
SAMBANOVA_API_KEY=your-sambanova-key
```

> **Note:** The `SUPABASE_JWT_SECRET` can be found in your Supabase Dashboard → Settings → API → JWT Secret.

**Step 3: Commit**

```bash
git add render.yaml .env.example
git commit -m "docs: add env variable documentation and render config update"
```

---

## Task 7: Error Handling for Rate Limits (~15 min)

**Files:**
- Modify: `src/note_taker/api/generate.py`

**Step 1: Add rate-limit-specific error handling**

In the `_generate_events` function, catch specific exception types and emit appropriate SSE error events:

```python
from tenacity import RetryError

# Inside the try/except in _generate_events:
except RetryError as e:
    logger.exception("Pipeline rate limited after retries")
    yield {
        "event": "error",
        "data": SSEErrorEvent(
            message="Rate limited by LLM provider. Please try again in a minute."
        ).model_dump_json(),
    }
except Exception as e:
    logger.exception("Pipeline error")
    yield {
        "event": "error",
        "data": SSEErrorEvent(
            message=f"Pipeline failed: {str(e)}"
        ).model_dump_json(),
    }
```

**Step 2: Run all tests**

Run: `pytest tests/ -v --tb=short`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add src/note_taker/api/generate.py
git commit -m "feat(api): add rate limit error handling for generate endpoint"
```

---

## Verification Plan

### Automated Tests

```bash
# Auth tests
pytest tests/api/test_auth.py -v

# Persistence tests
pytest tests/api/test_persistence.py -v

# Generate endpoint tests (includes auth integration)
pytest tests/api/test_generate.py -v

# Full test suite
pytest tests/ -v --tb=short
```

### Manual Verification

1. **Set up environment:**
   ```bash
   # Add to your .env file:
   # SUPABASE_URL=<your-url>
   # SUPABASE_SERVICE_ROLE_KEY=<your-key>
   # SUPABASE_JWT_SECRET=<your-jwt-secret>
   ```

2. **Start the server:**
   ```bash
   uv run uvicorn note_taker.api.main:app --reload --port 8000
   ```

3. **Test unauthenticated access (should be rejected):**
   ```bash
   curl -X POST http://localhost:8000/api/generate \
     -H "Content-Type: application/json" \
     -d '{"markdown": "# Test", "title": "Test"}'
   ```
   Expected: `401 Unauthorized`

4. **Test with a valid Supabase JWT:**
   - Log into the frontend at `http://localhost:3000`
   - Open browser DevTools → Application → Local Storage → find the `sb-*-auth-token`
   - Copy the `access_token` field
   - Use it:
   ```bash
   curl -N -X POST http://localhost:8000/api/generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-access-token>" \
     -d '{"markdown": "# Introduction\n\nAgents reason and act.", "title": "Agent Chapter"}'
   ```
   Expected: SSE events stream, ending with a `complete` event containing `artifact_id`

5. **Verify Supabase data:**
   - Go to Supabase Dashboard → Table Editor → `artifacts`
   - Confirm a new row was created with the correct `user_id` and `title`
   - Check `cards` table for corresponding Q&A rows

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT secret misconfiguration | High (all requests fail) | Clear error message on startup; `.env.example` |
| Service role key exposed | Critical (full DB access) | Never commit to git; use Render env vars |
| RLS bypass via service role | Medium | Service role used intentionally; validate `user_id` from JWT |
| Supabase insert failures | Medium | Catch and emit SSE error; don't crash the stream |
| Race condition on duplicate submits | Low | `source_hash` uniqueness not enforced; add later if needed |

---

## Dependency Chain

```
SOLO-101 (Scaffold FastAPI) ──✅ Done
        │
        ▼
SOLO-102 (SSE Endpoint) ── this plan builds on SOLO-102's generate endpoint
        │
        ▼
SOLO-103 (Auth + Supabase) ── this plan
```

> **Important:** SOLO-102 must be merged before starting SOLO-103. If working on both simultaneously, branch SOLO-103 from the SOLO-102 branch (Stacked PR pattern per GEMINI.md).
