# Implementation Plan: M7 — CORS Hardcoded Origins

## Issue Summary

The FastAPI CORS configuration in `src/note_taker/api/main.py` hardcodes `localhost:3000` and the Vercel production URL. Adding staging environments or changing domains requires a code change and redeployment.

## Technical Approach

Load CORS origins from an environment variable, falling back to the current hardcoded values for local development.

## Implementation Steps

### Step 1: Update `main.py` (5 min)

```python
import os

# CORS_ORIGINS can be a comma-separated list: "http://localhost:3000,https://staging.example.com"
default_origins = "http://localhost:3000,https://active-recall-generator.vercel.app"
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", default_origins).split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 2: Update `render.yaml` (2 min)

Add `CORS_ORIGINS` to the env vars section if needed.

### Step 3: Test (5 min)

1. Run without `CORS_ORIGINS` → verify defaults work
2. Set `CORS_ORIGINS=http://localhost:3001` → verify only that origin is allowed

## Acceptance Criteria

- [ ] CORS origins loaded from `CORS_ORIGINS` environment variable
- [ ] Sensible defaults for local development
- [ ] No code change needed to add new allowed origins

## Risk Assessment

None — purely a configuration flexibility improvement.

## Resources Required

- **Team**: 1 developer
- **Time**: ~12 minutes
