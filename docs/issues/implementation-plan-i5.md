# Implementation Plan: I5 — Missing Database Indexes

## Issue Summary

The Supabase schema has no indexes beyond primary keys. Common query patterns (filtering by `user_id`, `artifact_id`, `card_id`, date-based RPC queries) perform full table scans as data grows. This will cause progressively worsening performance.

## Technical Approach

Create a new migration that adds targeted indexes for foreign key columns and frequently queried fields. Use `CREATE INDEX CONCURRENTLY` where possible for non-blocking creation in production.

## Implementation Steps

### Step 1: Create migration file (10 min)

**Dependencies**: None

Create `supabase/migrations/20260301000002_add_indexes.sql`:

```sql
-- Foreign key indexes (Postgres does NOT auto-create these)
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id
  ON public.artifacts(user_id);

CREATE INDEX IF NOT EXISTS idx_cards_artifact_id
  ON public.cards(artifact_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id
  ON public.study_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_card_id
  ON public.study_sessions(card_id);

-- Composite index for study session ordering
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_reviewed
  ON public.study_sessions(user_id, reviewed_at DESC);

-- FSRS scheduling queries (cards due for review)
CREATE INDEX IF NOT EXISTS idx_cards_fsrs_due
  ON public.cards(fsrs_due)
  WHERE fsrs_state IN (1, 2, 3);  -- Only non-new cards
```

### Step 2: Apply and verify locally (10 min)

```bash
supabase db reset
# Verify migration applied without errors
```

### Step 3: Push to production (5 min)

```bash
supabase db push
```

## Acceptance Criteria

- [ ] All foreign key columns have corresponding indexes
- [ ] `supabase db reset` completes without errors
- [ ] `EXPLAIN` on common queries shows index scans instead of sequential scans

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Index creation locks table in production | Low | Use `CONCURRENTLY` for production deployment |
| Indexes slow down writes | Negligible | Write volume is low; read benefit outweighs |

**Rollback**: Drop indexes via a new migration.

## Resources Required

- **Team**: 1 backend developer
- **Time**: ~25 minutes
