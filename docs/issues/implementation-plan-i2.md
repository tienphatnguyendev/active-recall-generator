# Implementation Plan: I2 — N+1 Card Update Pattern in Study Session POST

## Issue Summary

The `POST /api/study` handler updates FSRS fields on cards using a sequential `for` loop, issuing one `UPDATE` query per card. For a study session reviewing 20+ cards, this creates 20+ individual database round-trips, significantly increasing latency and database load.

## Technical Approach

Replace the sequential loop with a single Supabase RPC call that accepts an array of card updates and performs them in a single transaction. Alternatively, restructure to use Supabase's batch capabilities.

## Implementation Steps

### Step 1: Create a batch-update RPC (20 min)

**Dependencies**: None

Add to a new migration `supabase/migrations/20260301000001_batch_update_cards.sql`:

```sql
CREATE OR REPLACE FUNCTION public.batch_update_card_fsrs(
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.cards c
  SET
    fsrs_state = (u->>'fsrs_state')::SMALLINT,
    fsrs_due = (u->>'fsrs_due')::TIMESTAMPTZ,
    fsrs_stability = (u->>'fsrs_stability')::FLOAT,
    fsrs_difficulty = (u->>'fsrs_difficulty')::FLOAT,
    fsrs_elapsed_days = (u->>'fsrs_elapsed_days')::INT,
    fsrs_scheduled_days = (u->>'fsrs_scheduled_days')::INT,
    fsrs_reps = (u->>'fsrs_reps')::INT,
    fsrs_lapses = (u->>'fsrs_lapses')::INT,
    updated_at = now()
  FROM jsonb_array_elements(p_updates) AS u
  WHERE c.id = (u->>'id')::UUID;
END;
$$;
```

### Step 2: Update the API route (15 min)

**Dependencies**: Step 1

In `app/api/study/route.ts`, replace the loop:

```diff
-for (const r of results) {
-  if (r.cardId && r.fsrs) {
-    await supabase.from('cards').update({...}).eq('id', r.cardId);
-  }
-}
+const cardUpdates = results
+  .filter((r: any) => r.cardId && r.fsrs)
+  .map((r: any) => ({
+    id: r.cardId,
+    fsrs_state: r.fsrs.state ?? r.state_after ?? 0,
+    fsrs_due: r.fsrs.due ?? new Date().toISOString(),
+    fsrs_stability: r.fsrs.stability ?? 0,
+    fsrs_difficulty: r.fsrs.difficulty ?? 0,
+    fsrs_elapsed_days: r.fsrs.elapsed_days ?? 0,
+    fsrs_scheduled_days: r.fsrs.scheduled_days ?? 0,
+    fsrs_reps: r.fsrs.reps ?? 0,
+    fsrs_lapses: r.fsrs.lapses ?? 0,
+  }));
+
+if (cardUpdates.length > 0) {
+  const { error: updateError } = await supabase.rpc('batch_update_card_fsrs', {
+    p_updates: cardUpdates,
+  });
+  if (updateError) console.error('Batch card update failed:', updateError);
+}
```

### Step 3: Test (15 min)

**Dependencies**: Steps 1–2

1. Reset local DB: `supabase db reset`
2. Create an artifact with 10+ cards
3. Complete a study session reviewing all cards
4. Verify all cards have updated FSRS fields
5. Check Supabase logs: confirm single RPC call instead of N updates

## Acceptance Criteria

- [ ] Card FSRS updates happen in a single RPC call
- [ ] No sequential `for` loop for card updates remains
- [ ] Study session with 20 cards completes in <500ms (vs ~2s+ before)
- [ ] All FSRS fields are correctly updated

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| RPC input validation for malformed data | Medium | Add `COALESCE` defaults in SQL |
| RLS blocks the update | Low | `SECURITY INVOKER` respects the user's RLS policies |

**Rollback**: Revert to sequential updates; drop the RPC function.

## Resources Required

- **Team**: 1 full-stack developer
- **Time**: ~50 minutes
