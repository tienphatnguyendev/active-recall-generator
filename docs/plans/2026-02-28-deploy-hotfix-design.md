# Deployment Bug Fix Design

**Date:** 2026-02-28
**Topic:** Render Deployment Failure (uv venv)

## Background

The recent hotfix adding `render.yaml` for production deployment causes a build failure on Render:

```
error: Failed to create virtual environment
Caused by: A virtual environment already exists at `/opt/render/project/src/.venv`. Use `--clear` to replace it
```

Simultaneously, the deployment script downloads and runs `astral.sh/uv/install.sh` via `curl` on every build, creating unpinned and shadowed binaries instead of using Render's built-in `uv`. Lastly, the `.python-version` file is set to `3.9`, which is beyond end-of-life and risky for modern libraries like FastAPI and Pydantic.

## Proposed Fixes

We will implement "Option 2" from code review, which addresses the Critical error blocking the deploy, plus the Important security/performance flaws in the environment setup.

### 1. Fix the Primary Failure: Virtual Environment Conflict
- **Change:** Add the `--clear` flag to the `uv venv` command.
- **Why:** Render automatically creates a `.venv` directory in the project root. Without `--clear`, `uv venv` refuses to overwrite it, killing the deploy.
- **Affected File:** `render.yaml`

### 2. Streamline the Build Script (Security & Speed)
- **Change:** Remove `curl -LsSf https://astral.sh/uv/install.sh | sh &&` from `buildCommand`.
- **Change:** Ensure the existing commands don't rely on the downloaded `$HOME/.local/bin/uv` but rather the native `uv` command provided in the Render PATH.
- **Why:** Downloading and executing a random shell script via curl is a security risk (supply chain). It also slows down every build by 3-5 seconds and can fail if the URL goes down. Render already provides the `uv` binary natively in its environment.
- **Affected File:** `render.yaml`

### 3. Upgrade Python Version to 3.12
- **Change:** Update `.python-version` from `3.9` to `3.12`.
- **Change:** Update `requires-python` in `pyproject.toml` from `>=3.9` to `>=3.12`.
- **Why:** Python 3.9 is EOL as of late 2025. Python 3.12 is highly performant and widely supported by modern Python web frameworks.
- **Affected Files:** `.python-version`, `pyproject.toml`

## Required Actions

1. Modify `render.yaml`:
   - `buildCommand`: `uv venv --clear && uv pip install -e .`
   - `startCommand`: `uv run uvicorn note_taker.api.main:app --host 0.0.0.0 --port $PORT`
2. Update `.python-version` to `3.12`
3. Update `pyproject.toml` `requires-python` to `>=3.12`

## Testing Plan
1. Local: Delete the existing `.venv`, run `uv venv --clear` and `uv pip install -e .` to verify local startup on Python 3.12.
2. Production: The only true validation is pushing to Render and observing a successful build.
