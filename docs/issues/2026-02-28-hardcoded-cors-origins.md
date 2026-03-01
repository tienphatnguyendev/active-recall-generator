# Hardcoded CORS Origins in FastAPI Backend

**Date**: 2026-02-28
**Severity**: 🟡 Medium
**Status**: Open

---

## Problem Description

The CORS `allow_origins` list in the FastAPI backend is hardcoded to two specific URLs. Adding staging environments, preview deployments, or custom domains requires a code change and redeployment.

**File**: [api/main.py](file:///Users/aaronng/repos/note-taker/src/note_taker/api/main.py#L12-L15)

```python
origins = [
    "http://localhost:3000",
    "https://active-recall-generator.vercel.app",
]
```

## Impact

- Cannot use the API from Vercel preview deployments (e.g., `https://active-recall-generator-*-vercel.app`)
- Adding a staging or custom domain requires code changes
- `http://localhost:3000` is a development-only origin shipped to production

## Resolution

Load origins from an environment variable with a fallback:

```python
import os

origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,https://active-recall-generator.vercel.app"
).split(",")
```

And add `CORS_ORIGINS` to `render.yaml` envVars:

```yaml
envVars:
  - key: CORS_ORIGINS
    sync: false
```

## Prevention

- All environment-specific configuration should come from environment variables
- Document required env vars in `.env.example` and `README.md`
