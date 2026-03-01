# Implementation Plan: M6 — Python DatabaseManager Uses Local SQLite

## Issue Summary

The CLI/pipeline backend uses a local SQLite database (`database.py` with `DatabaseManager` class), completely separate from the Supabase Postgres database. Artifacts generated via the CLI never appear in the web UI and vice versa.

## Technical Approach

Replace the SQLite `DatabaseManager` with a Supabase client that writes to the same `artifacts` and `cards` tables used by the frontend. Keep the SQLite path as a fallback for offline/local-only usage.

## Implementation Steps

### Step 1: Add `supabase` Python dependency (5 min)

```bash
uv pip install supabase
```

Update `pyproject.toml`:

```toml
dependencies = [
    # ...existing...
    "supabase>=2.0.0",
]
```

### Step 2: Create Supabase database adapter (30 min)

Create `src/note_taker/supabase_db.py`:

```python
import os
from typing import Optional
from supabase import create_client, Client
from note_taker.models import FinalArtifactV1

class SupabaseDatabaseManager:
    def __init__(self):
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self.client: Client = create_client(url, key)

    def save_artifact(self, user_id: str, title: str, artifact: FinalArtifactV1) -> str:
        # Insert artifact row
        result = self.client.table("artifacts").insert({
            "user_id": user_id,
            "title": title,
            "source_hash": artifact.source_hash,
            "outline_json": [item.model_dump() for item in artifact.outline],
        }).execute()
        artifact_id = result.data[0]["id"]

        # Insert cards
        cards = [
            {
                "artifact_id": artifact_id,
                "question": qa.question,
                "answer": qa.answer,
                "source_context": qa.source_context,
                "judge_score": qa.judge_score,
            }
            for qa in artifact.qa_pairs
        ]
        self.client.table("cards").insert(cards).execute()
        return artifact_id
```

### Step 3: Update pipeline to use adapter (15 min)

Add an environment-based switch in `processing.py` or the CLI entry point:

```python
if os.environ.get("SUPABASE_URL"):
    from note_taker.supabase_db import SupabaseDatabaseManager
    db = SupabaseDatabaseManager()
else:
    from note_taker.database import DatabaseManager
    db = DatabaseManager()
```

### Step 4: Test (15 min)

1. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Run CLI: `note-taker process sample.md`
3. Verify artifact appears in Supabase (check `/artifacts` page)

## Acceptance Criteria

- [ ] CLI pipeline can write to Supabase when env vars are set
- [ ] SQLite fallback still works when env vars are absent
- [ ] Artifacts from CLI appear in the web UI

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Service role key exposed | Medium | Only use in server/CLI contexts, never frontend |
| Schema mismatch between models and DB | Medium | Use generated types or shared schema |

## Resources Required

- **Team**: 1 backend developer
- **Time**: ~65 minutes
- **Dependencies**: `supabase` Python package
