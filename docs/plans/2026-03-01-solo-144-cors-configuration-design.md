# Design Document: Configure CORS for Python Backend (SOLO-144)

## Overview
CORS (Cross-Origin Resource Sharing) is currently configured in the FastAPI backend but lacks robust validation and documentation. This design ensures that `CORS_ORIGINS` is strictly enforced as a comma-separated list of authorized origins, specifically forbidding wildcards (`*`) to maintain security.

## Context
- **Issue**: [SOLO-144](https://linear.app/aaron-solo/issue/SOLO-144/infrabackend-api-configure-cors-for-python-backend)
- **Current State**: `src/note_taker/api/main.py` uses a simple split and strip on `CORS_ORIGINS`.
- **Requirements**: Strictly enforce comma-separated list, avoid `*`, and document in `.env.example`.

## Proposed Design: Approach 1 (Enhanced Manual Validation)

### 1. Configuration Logic & Validation
In `src/note_taker/api/main.py`, the CORS configuration will be updated to:
- Retrieve `CORS_ORIGINS` from the environment (default: `http://localhost:3000`).
- Split by commas and strip whitespace from each entry.
- Filter out any entry that is exactly `*`.
- Ensure each entry starts with `http://` or `https://`.
- Skip empty strings or invalid entries.
- Fallback to `["http://localhost:3000"]` if the resulting list is empty.

### 2. Environment Documentation
Update `.env.example` to include a commented-out example of multiple origins for production and local development.

### 3. Testing Strategy
A new test file `tests/api/test_cors.py` will be created to verify:
- **Success**: Valid origins (e.g., `http://localhost:3000`) receive the correct `Access-Control-Allow-Origin` header.
- **Security**: Unauthorized origins or wildcards in the environment string do not result in a wildcard `Access-Control-Allow-Origin` header.
- **Robustness**: Empty or malformed `CORS_ORIGINS` strings fallback safely to the local development default.

## Verification Plan
1. Run `pytest tests/api/test_cors.py`.
2. Verify `.env.example` contains the correct documentation.
3. Manually verify local frontend (`http://localhost:3000`) can still reach the backend.
