# Redundant `curl` Download of `uv` in Build Command

**Date**: 2026-02-28
**Severity**: 🟡 Medium
**Status**: Fix in progress on branch `aaronngdev/solo-104-hotfix-fix-render-deployment`

---

## Problem Description

The Render build command downloads `uv` via `curl` from `astral.sh`, even though Render already provides `uv` (v0.10.2) as part of its Python environment. This causes:

1. **Unnecessary network dependency** — the build fails if `astral.sh` is unreachable
2. **Version shadowing** — the curl-installed `uv` (v0.10.7) shadows Render's pre-installed version, as evidenced by the log warning: `WARN: The following commands are shadowed by other commands in your PATH: uv uvx`
3. **Wasted build time** — ~2 seconds per build for the download + install

**File**: [render.yaml](file:///Users/aaronng/repos/note-taker/render.yaml#L5)

```yaml
buildCommand: "curl -LsSf https://astral.sh/uv/install.sh | sh && $HOME/.local/bin/uv venv && ..."
```

## Impact

- Fragile builds — external dependency on third-party CDN during build
- Inconsistent `uv` versions between what Render manages and what's actually used
- Minor build slowdown

## Resolution

Remove the `curl` download and use Render's pre-installed `uv` directly:

```diff
-buildCommand: "curl -LsSf https://astral.sh/uv/install.sh | sh && $HOME/.local/bin/uv venv && $HOME/.local/bin/uv pip install -e ."
+buildCommand: "uv venv --clear && uv pip install -e ."
```

## Prevention

- Pin the Render `uv` version in `render.yaml` using Render's native version control if a specific version is needed
- Avoid downloading tools that the platform already provides
