# Missing Health Check Path in `render.yaml`

**Date**: 2026-02-28
**Severity**: 🟡 Medium
**Status**: Open

---

## Problem Description

The `render.yaml` does not configure a `healthCheckPath`. The FastAPI backend has a `/health` endpoint, but Render doesn't know to use it for service health monitoring. Without this, Render relies on TCP port checks, which may report a service as healthy even if the application is in a degraded state (e.g., database unreachable).

**File**: [render.yaml](file:///Users/aaronng/repos/note-taker/render.yaml)

```yaml
services:
  - type: web
    name: active-recall-backend
    env: python
    # No healthCheckPath configured
```

## Impact

- Render may route traffic to an unhealthy instance
- Deployment rollbacks won't trigger on application-level failures
- No visibility into application health from Render's dashboard

## Resolution

Add `healthCheckPath` to the service configuration:

```diff
 services:
   - type: web
     name: active-recall-backend
     env: python
+    healthCheckPath: /health
     buildCommand: "uv venv --clear && uv pip install -e ."
```

Optionally, enhance the `/health` endpoint to check downstream dependencies:

```python
@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
```

## Prevention

- Include `healthCheckPath` in all Render service templates
- Consider a `/ready` (deep check) and `/health` (shallow check) pattern
