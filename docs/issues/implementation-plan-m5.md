# Implementation Plan: M5 — FastAPI Backend Is a Skeleton

## Issue Summary

The FastAPI application at `src/note_taker/api/` only serves a single `/health` endpoint. The processing pipeline (`processing.py`, `pipeline/`) and LLM infrastructure (`llm.py`) exist but are not exposed via the API. The frontend never calls the backend.

## Technical Approach

This is a **tracking issue** — the real implementation is captured in **I4** (Generate Page Integration). This plan documents the incremental API surface that needs to be built.

## Implementation Steps

### Step 1: Define API schema (30 min)

Design the REST API endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/pipeline/run` | Submit markdown for processing |
| `GET` | `/api/v1/pipeline/{id}/status` | Check pipeline status |
| `GET` | `/api/v1/pipeline/{id}/result` | Retrieve processing result |
| `GET` | `/health` | Health check (already exists) |

### Step 2: Implement pipeline submission endpoint (45 min)

Add to `src/note_taker/api/routes.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

class PipelineRequest(BaseModel):
    content: str
    book_name: str
    chapter_name: str

@router.post("/api/v1/pipeline/run")
async def run_pipeline(request: PipelineRequest):
    # Validate, enqueue, return job ID
    pass
```

### Step 3: Add Supabase integration (see I4)

### Step 4: Add authentication middleware (20 min)

Verify Supabase JWT tokens in FastAPI:

```python
from fastapi import Depends, Security
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(credentials = Security(security)):
    # Verify JWT with Supabase
    pass
```

## Acceptance Criteria

- [ ] At least `/api/v1/pipeline/run` implemented
- [ ] Authentication middleware in place
- [ ] Frontend can submit content and receive results

## Risk Assessment

This is greenfield development — main risk is scope creep.

## Resources Required

- **Team**: 1 backend developer
- **Time**: ~4 hours (full implementation)
- **Dependencies**: I4 (frontend integration)
