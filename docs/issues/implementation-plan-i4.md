# Implementation Plan: I4 — Generate Page Is Client-Side Simulation Only

## Issue Summary

The main "Generate" page (`app/page.tsx`) simulates the Draft → Judge → Revise pipeline entirely with `setTimeout` calls. It never contacts the Python/FastAPI backend. The `usePipelineSSE` hook exists but is never connected. The UI text references "SQLite" which is stale — the app now uses Supabase.

## Technical Approach

This is a **large feature** that should be tracked as a separate project milestone. The implementation plan here covers only the **MVP integration** — connecting the frontend to the FastAPI backend for real pipeline execution. Full FSRS integration and real-time SSE are out of scope.

## Implementation Steps

### Step 1: Implement FastAPI pipeline endpoint (60 min)

**Dependencies**: Backend `routes.py` is currently a skeleton

Add a `POST /api/v1/pipeline/run` endpoint that:
1. Accepts markdown content, book name, chapter name
2. Runs the existing `processing.py` pipeline
3. Stores results in Supabase (not SQLite)
4. Returns the generated artifact ID

### Step 2: Add Supabase integration to Python backend (45 min)

**Dependencies**: Step 1

Replace `DatabaseManager` (SQLite) with a Supabase client:

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)
```

### Step 3: Connect frontend to backend (30 min)

**Dependencies**: Steps 1–2

Replace `runSimulation()` in `app/page.tsx` with a real `fetch()` call to the backend, using the `usePipelineSSE` hook for progress updates.

### Step 4: Update UI text (5 min)

```diff
-text: "Artifacts are stored in SQLite with deduplication",
+text: "Artifacts are stored in Supabase with deduplication",
```

### Step 5: Test end-to-end (30 min)

1. Paste markdown → click "Run Pipeline"
2. Verify pipeline stages update in real-time
3. Verify artifact appears in `/artifacts` page
4. Verify Q&A cards are browseable in `/study`

## Acceptance Criteria

- [ ] Generate page sends markdown to FastAPI backend
- [ ] Backend processes content through the LLM pipeline
- [ ] Results are stored in Supabase
- [ ] Generated artifacts visible in the frontend
- [ ] UI text is accurate (no SQLite references)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| LLM API keys not configured | Medium | Fail gracefully with clear error message |
| Long processing time (>30s) | High | Use SSE/polling for progress; don't block |
| CORS issues between Next.js and FastAPI | Low | CORS already configured in `main.py` |

**Rollback**: Keep simulation mode as a feature flag fallback.

## Resources Required

- **Team**: 1 full-stack developer
- **Time**: ~3 hours
- **Dependencies**: LLM API keys, FastAPI running locally
