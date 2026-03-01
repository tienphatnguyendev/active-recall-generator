# Secure FastAPI & Supabase Integration (SOLO-103) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Secure the `POST /api/generate` endpoint with Supabase JWT verification and persist results to Supabase.

**Architecture:** 
- Add `persist_locally` flag to `GraphState` to skip local SQLite writes in API context.
- Implement `get_current_user` FastAPI dependency for JWT verification.
- Create `persistence.py` for Supabase admin operations.
- Update `generate` endpoint to require auth and call Supabase persistence after pipeline completion.

**Tech Stack:** FastAPI, PyJWT, supabase-py, LangGraph

---

### Task 1: Add PyJWT Dependency

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add PyJWT to dependencies**

Add `"pyjwt[crypto]>=2.11.0"` to `dependencies` in `pyproject.toml`.

**Step 2: Install dependencies**

Run: `uv pip install -e .`
Expected: `pyjwt` installed.

**Step 3: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "build: add pyjwt dependency"
```

---

### Task 2: Update GraphState and Save Node

**Files:**
- Modify: `src/note_taker/pipeline/state.py`
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `src/note_taker/pipeline/graph.py`
- Test: `tests/pipeline/test_nodes.py`

**Step 1: Update GraphState**

Add `persist_locally: bool` to `GraphState` in `src/note_taker/pipeline/state.py`.

**Step 2: Update save_to_db_node**

Modify `save_to_db_node` in `src/note_taker/pipeline/nodes.py` to check `state.get("persist_locally", True)`.

**Step 3: Update build_graph default**

Ensure `build_graph` handles the new state field correctly (LangGraph usually handles this via the state definition).

**Step 4: Write test for conditional save**

Add a test case in `tests/pipeline/test_nodes.py` that verifies `save_to_db_node` does NOT call `db.save_artifact` when `persist_locally` is `False`.

**Step 5: Run tests**

Run: `pytest tests/pipeline/test_nodes.py`
Expected: PASS

**Step 6: Commit**

```bash
git add src/note_taker/pipeline/state.py src/note_taker/pipeline/nodes.py tests/pipeline/test_nodes.py
git commit -m "feat(pipeline): add persist_locally flag to skip local save"
```

---

### Task 3: Create Supabase Client Module

**Files:**
- Create: `src/note_taker/api/supabase_client.py`
- Modify: `src/note_taker/api/main.py`

**Step 1: Implement Supabase client singleton**

File: `src/note_taker/api/supabase_client.py` (as per design).

**Step 2: Load .env in main.py**

Add `load_dotenv()` at the top of `src/note_taker/api/main.py`.

**Step 3: Commit**

```bash
git add src/note_taker/api/supabase_client.py src/note_taker/api/main.py
git commit -m "feat(api): add Supabase client singleton"
```

---

### Task 4: Implement JWT Auth Dependency

**Files:**
- Create: `src/note_taker/api/auth.py`
- Create: `tests/api/test_auth.py`

**Step 1: Write failing tests**

File: `tests/api/test_auth.py` with cases for valid, expired, missing, and invalid tokens.

**Step 2: Implement auth logic**

File: `src/note_taker/api/auth.py` using `PyJWT` and `HTTPBearer`.

**Step 3: Run tests**

Run: `pytest tests/api/test_auth.py`
Expected: PASS

**Step 4: Commit**

```bash
git add src/note_taker/api/auth.py tests/api/test_auth.py
git commit -m "feat(api): add JWT auth dependency"
```

---

### Task 5: Add Supabase Persistence Logic

**Files:**
- Create: `src/note_taker/api/persistence.py`
- Create: `tests/api/test_persistence.py`

**Step 1: Write failing tests**

File: `tests/api/test_persistence.py` mocking the Supabase client.

**Step 2: Implement persistence logic**

File: `src/note_taker/api/persistence.py` to save `artifacts` and `cards`.

**Step 3: Run tests**

Run: `pytest tests/api/test_persistence.py`
Expected: PASS

**Step 4: Commit**

```bash
git add src/note_taker/api/persistence.py tests/api/test_persistence.py
git commit -m "feat(api): add Supabase persistence logic"
```

---

### Task 6: Wire Auth + Persistence into Generate Endpoint

**Files:**
- Modify: `src/note_taker/api/generate.py`
- Modify: `tests/api/test_generate.py`

**Step 1: Update generate route**

Modify `generate` in `src/note_taker/api/generate.py`:
- Add `user: AuthenticatedUser = Depends(get_current_user)`.
- Pass `persist_locally=False` in `initial_state`.
- Call `save_artifact_to_supabase` after graph completion.
- Emit `saving_to_supabase` stage events.

**Step 2: Update tests**

Modify `tests/api/test_generate.py` to mock `get_current_user` and verify persistence calls.

**Step 3: Run tests**

Run: `pytest tests/api/test_generate.py`
Expected: PASS

**Step 4: Commit**

```bash
git add src/note_taker/api/generate.py tests/api/test_generate.py
git commit -m "feat(api): secure generate endpoint and add Supabase persistence"
```

---

### Task 7: Final Config and Error Handling

**Files:**
- Modify: `render.yaml`
- Create: `.env.example`
- Modify: `src/note_taker/api/generate.py`

**Step 1: Update render.yaml and .env.example**

Add `SUPABASE_JWT_SECRET` and other relevant keys.

**Step 2: Add Rate Limit handling**

Catch `tenacity.RetryError` in `_generate_events` and emit a specific error event.

**Step 3: Final verification**

Run all tests in the worktree.

**Step 4: Commit**

```bash
git add render.yaml .env.example src/note_taker/api/generate.py
git commit -m "feat(api): add rate limit handling and update config docs"
```
