# Python Version Mismatch: `.python-version` Says 3.9, Render Uses 3.12

**Date**: 2026-02-28
**Severity**: 🟠 High
**Status**: Fix in progress on branch `aaronngdev/solo-104-hotfix-fix-render-deployment`

---

## Problem Description

The `.python-version` file specifies Python `3.9`, but:

1. Render installs Python **3.12.12** (reading from `.python-version` but using 3.12 via its own resolution)
2. `pyproject.toml` declares `requires-python = ">=3.9"` which is overly permissive
3. The `langchain-cerebras` package has a known import compatibility issue with Python 3.12+ that requires a try/except guard (already handled in the fix branch)

**Files**:
- [.python-version](file:///Users/aaronng/repos/note-taker/.python-version) — contains `3.9`
- [pyproject.toml](file:///Users/aaronng/repos/note-taker/pyproject.toml#L6) — `requires-python = ">=3.9"`

## Impact

- Dependency resolution may pull packages incompatible with the actual runtime version
- `langchain-cerebras` import failure at runtime on Python 3.12
- Developers may test against 3.9 locally while production runs 3.12

## Resolution

Align `.python-version` and `pyproject.toml` to the actual deployment target:

```diff
# .python-version
-3.9
+3.12

# pyproject.toml
-requires-python = ">=3.9"
+requires-python = ">=3.12"
```

And guard the `langchain-cerebras` import (already done in fix branch):

```python
try:
    from langchain_cerebras import ChatCerebras
except ImportError:
    ChatCerebras = None
```

## Prevention

- Add a CI check that validates `.python-version` matches `pyproject.toml`
- Pin a single supported Python version across all environments
