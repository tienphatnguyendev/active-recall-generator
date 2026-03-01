# Render Build Failure: `uv venv` Conflict with Pre-existing `.venv`

**Date**: 2026-02-28
**Severity**: 🔴 Critical
**Status**: Fix in progress on branch `aaronngdev/solo-104-hotfix-fix-render-deployment`

---

## Problem Description

The Render deployment fails during the build step because `uv venv` refuses to create a virtual environment when one already exists at `/opt/render/project/src/.venv`. Render's Python environment pre-creates this directory.

**File**: [render.yaml](file:///Users/aaronng/repos/note-taker/render.yaml#L5)

```yaml
buildCommand: "curl -LsSf https://astral.sh/uv/install.sh | sh && $HOME/.local/bin/uv venv && $HOME/.local/bin/uv pip install -e ."
```

## Steps to Reproduce

1. Push any commit to `main` that triggers a Render deploy
2. Render clones the repo and runs the build command
3. `uv venv` detects the pre-existing `.venv` directory
4. Build fails with: `error: Failed to create virtual environment — A virtual environment already exists at /opt/render/project/src/.venv. Use --clear to replace it`

## Impact

- **Complete deployment blocker** — no code can be deployed to production
- Backend API (`active-recall-backend`) is unreachable
- Any frontend features depending on the backend API are broken

## Root Cause

The `uv venv` command (without `--clear`) is idempotent-*unfriendly*: it errors when a `.venv` already exists. Render's Python build environment pre-provisions a `.venv` before running the user's build command.

## Resolution

Add `--clear` flag to `uv venv` so it replaces any pre-existing venv:

```diff
-buildCommand: "curl -LsSf https://astral.sh/uv/install.sh | sh && $HOME/.local/bin/uv venv && $HOME/.local/bin/uv pip install -e ."
+buildCommand: "uv venv --clear && uv pip install -e ."
```

> [!NOTE]
> The fix branch also removes the redundant `curl` install of `uv` (see [2026-02-28-redundant-uv-curl-install.md](./2026-02-28-redundant-uv-curl-install.md)).

## Prevention

- Add a CI step that validates `render.yaml` build commands execute successfully in a clean container
- Document Render's environment assumptions in project README
