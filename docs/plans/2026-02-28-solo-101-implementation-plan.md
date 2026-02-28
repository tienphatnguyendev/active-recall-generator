# Scaffold FastAPI Application Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a new Python FastAPI application integrated into the `note_taker` package with CORS configured for the Next.js frontend.

**Architecture:** We will create an `api` sub-package inside `src/note_taker/` containing the FastAPI application instance (`main.py`) and initial routers (`routes.py`). We will also add a simple `/health` endpoint and configure CORS to allow requests from `http://localhost:3000`.

**Tech Stack:** FastAPI, Uvicorn, Pytest (with TestClient).

---

### Task 1: Add API Dependencies

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add dependencies to pyproject.toml**

```toml
    "pytest>=8.0.0",
    "supabase>=2.28.0",
    "langchain-cerebras>=0.6.0",
    "langchain-sambanova>=0.2.0",
    "fastapi>=0.110.0",
    "uvicorn>=0.29.0",
    "httpx>=0.27.0",
```
*(Add `fastapi`, `uvicorn`, and `httpx` for TestClient to the `dependencies` list)*

**Step 2: Install dependencies**

Run: `uv pip install -e .`
Expected: Successfully installs fastapi, uvicorn, and httpx.

**Step 3: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "build: add fastapi, uvicorn, and httpx dependencies"
```

---

### Task 2: Implement FastAPI Application and CORS

**Files:**
- Create: `tests/api/test_routes.py`
- Create: `src/note_taker/api/__init__.py`
- Create: `src/note_taker/api/routes.py`
- Create: `src/note_taker/api/main.py`

**Step 1: Write the failing test**

File: `tests/api/test_routes.py`
```python
from fastapi.testclient import TestClient
from note_taker.api.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/api/test_routes.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'note_taker.api'`

**Step 3: Write minimal implementation**

File: `src/note_taker/api/__init__.py`
*(Empty file)*

File: `src/note_taker/api/routes.py`
```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}
```

File: `src/note_taker/api/main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from note_taker.api.routes import router as api_router

app = FastAPI(
    title="Note Taker API",
    description="Backend API for the Note Taker application",
    version="0.1.0",
)

# Configure CORS for Next.js frontend
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/api/test_routes.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/api/test_routes.py src/note_taker/api/
git commit -m "feat: scaffold FastAPI app with CORS and health check"
```
