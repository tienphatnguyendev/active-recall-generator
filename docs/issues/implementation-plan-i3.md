# Implementation Plan: I3 — Dual Study Session Write Paths

## Issue Summary

Study session creation has two entry points: a Server Action (`app/actions/study.ts: logStudySession`) and an API route (`app/api/study/route.ts: POST`). They have different schemas, different validation, and different capabilities (the API route handles FSRS updates; the server action does not). This creates maintenance burden and data inconsistency risks.

## Technical Approach

Consolidate to a single Server Action as the canonical write path. Move FSRS update logic into the server action. Delete the `POST` handler from the API route (keep `GET` if still needed by client-side fetching).

## Implementation Steps

### Step 1: Enhance the Server Action (20 min)

**Dependencies**: I2 (batch update RPC)

Update `app/actions/study.ts`:

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface StudyResult {
  cardId: string;
  rating: number;
  durationMs: number;
  stateBefore: number;
  stateAfter: number;
  fsrs?: {
    state: number; due: string; stability: number; difficulty: number;
    elapsed_days: number; scheduled_days: number; reps: number; lapses: number;
  };
}

export async function submitStudySession(
  artifactId: string,
  results: StudyResult[]
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  // 1. Insert study session records
  const sessionRecords = results.map(r => ({
    user_id: user.id,
    card_id: r.cardId,
    rating: r.rating,
    duration_ms: r.durationMs,
    state_before: r.stateBefore,
    state_after: r.stateAfter,
  }));

  const { error: insertError } = await supabase
    .from("study_sessions")
    .insert(sessionRecords);
  if (insertError) throw new Error(`Failed: ${insertError.message}`);

  // 2. Batch update FSRS fields via RPC
  const cardUpdates = results
    .filter(r => r.fsrs)
    .map(r => ({ id: r.cardId, ...r.fsrs }));

  if (cardUpdates.length > 0) {
    await supabase.rpc("batch_update_card_fsrs", { p_updates: cardUpdates });
  }

  revalidatePath("/study");
  revalidatePath("/analytics");
}
```

### Step 2: Update client components to use the new action (15 min)

**Dependencies**: Step 1

Find all callers of the old `logStudySession` and the `POST /api/study` endpoint. Update them to use `submitStudySession`.

### Step 3: Remove `POST` handler from API route (5 min)

**Dependencies**: Step 2

In `app/api/study/route.ts`, delete the `POST` function. Keep `GET` if needed.

### Step 4: Delete old `logStudySession` action (2 min)

Remove the simple version from `app/actions/study.ts`.

### Step 5: Test (10 min)

1. Complete a study session with "know", "unsure", "unknown" ratings
2. Verify records appear in `study_sessions` table
3. Verify FSRS fields updated on cards
4. Verify analytics page reflects new data

## Acceptance Criteria

- [ ] Single `submitStudySession` server action handles all study writes
- [ ] No `POST` handler in `app/api/study/route.ts`
- [ ] FSRS updates integrated into the study action
- [ ] All client code calls the new action
- [ ] `pnpm build` succeeds

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Client components that can't use server actions | Low | All study UI is already React-based |
| Missing `revalidatePath` calls | Low | Add paths for `/study` and `/analytics` |

**Rollback**: Restore both write paths.

## Resources Required

- **Team**: 1 full-stack developer
- **Time**: ~52 minutes
- **Dependencies**: I2 (batch update RPC)
