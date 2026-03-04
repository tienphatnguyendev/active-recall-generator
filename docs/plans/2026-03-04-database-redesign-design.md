# Database Redesign: Hierarchical Folder Schema with `ltree`

**Date:** 2026-03-04  
**Status:** Approved  

## Problem

The current schema stores artifacts in a flat structure tied directly to `user_id`.
There is no concept of books, chapters, or sections. This makes it impossible to:

- Query all cards/artifacts under a given book (recursively through nested levels)
- Aggregate study progress per book or chapter
- Organize content hierarchically

## Decision

Use PostgreSQL's `ltree` extension to model an unlimited-depth folder tree.
Each folder stores a materialized path (e.g., `ml_abc123.ch1_def456.s1_ghi789`),
enabling instant ancestor/descendant queries via GiST-indexed `ltree` operators.

### Why `ltree` over alternatives?

| Approach | Recursive reads | Aggregation | Move cost | Complexity |
|---|---|---|---|---|
| **`ltree` (chosen)** | O(1) via GiST index | Fast (single query) | Moderate (string update) | Low |
| Adjacency list + CTE | Slow at scale | Slow (recursive join) | O(1) | Low |
| Closure table | Fast | Fast | Complex (multi-row ops) | High |

`ltree` was chosen because the must-have queries (recursive descendant lookups and
aggregated stats) are read-heavy, and `ltree` excels at exactly that. The trade-off
(slightly more work for folder moves) is acceptable since reorganization is infrequent.

## New Schema

### `folders` table (NEW)

```sql
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path LTREE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_folders_path ON public.folders USING GIST (path);
CREATE INDEX idx_folders_user_id ON public.folders (user_id);
```

### `artifacts` table (MODIFIED)

```sql
CREATE TABLE public.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    outline JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_artifacts_folder_id ON public.artifacts (folder_id);
```

- `user_id` removed — ownership inferred through `artifact → folder → user`.

### `cards` and `study_sessions` tables (UNCHANGED)

Structure remains identical. Only the data is cleared.

## Path Convention

Each path segment is a sanitized slug + short unique suffix to avoid collisions.

| User action | `name` | `path` |
|---|---|---|
| Create book "Machine Learning" | Machine Learning | `ml_abc123` |
| Add "Chapter 1" inside book | Chapter 1 | `ml_abc123.ch1_def456` |
| Add "1.1 What is ML?" inside Ch1 | 1.1 What is ML? | `ml_abc123.ch1_def456.s11_ghi789` |

The `name` column stores the human-readable label. The `path` column is for querying only.

## Key Query Patterns

```sql
-- All cards under a book (instant, GiST-indexed)
SELECT c.* FROM cards c
JOIN artifacts a ON a.id = c.artifact_id
JOIN folders f ON f.id = a.folder_id
WHERE f.path <@ 'ml_abc123';

-- Direct children of a folder
SELECT * FROM folders
WHERE path ~ 'ml_abc123.*{1}';

-- Study progress for an entire book
SELECT
  COUNT(*) AS total_cards,
  COUNT(*) FILTER (WHERE c.fsrs_state = 2) AS mastered
FROM cards c
JOIN artifacts a ON a.id = c.artifact_id
JOIN folders f ON f.id = a.folder_id
WHERE f.path <@ 'ml_abc123';
```

## RLS Policies

Ownership flows through the folder chain:

- **folders**: `WHERE user_id = auth.uid()` (direct)
- **artifacts**: `WHERE folder_id IN (user's folders)` (one join)
- **cards**: `WHERE artifact_id IN (user's artifacts in user's folders)` (two joins)
- **study_sessions**: `WHERE user_id = auth.uid()` (direct, unchanged)

## API Changes

| Method | Endpoint | Change |
|---|---|---|
| `POST` | `/api/folders` | **New** — create folder (with optional `parent_id`) |
| `GET` | `/api/folders` | **New** — get user's full folder tree |
| `PATCH` | `/api/folders/{id}` | **New** — rename a folder |
| `DELETE` | `/api/folders/{id}` | **New** — delete folder (cascades) |
| `POST` | `/api/generate` | **Modified** — adds required `folder_id` field |

## Migration Strategy

Clean slate: drop all existing content tables and recreate with the new schema.
User accounts (`public.users`) are preserved.

1. Drop `study_sessions`, `cards`, `artifacts` (in FK order)
2. Enable `ltree` extension
3. Create `folders` table with GiST index
4. Recreate `artifacts` with `folder_id` FK
5. Recreate `cards` (same structure)
6. Recreate `study_sessions` (same structure)
7. Apply new RLS policies

## Scope Exclusions (YAGNI)

- No folder move/rearrange endpoint in v1 (can be added later)
- No sharing or collaboration features
- No folder-level metadata (description, color, icon) in v1
