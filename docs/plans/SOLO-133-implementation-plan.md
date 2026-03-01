# Frontend Technical Debt & Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address frontend technical debt: consolidate duplicate Supabase server clients (SOLO-110), unify study session data paths (SOLO-115), fix duplicate import in study action (SOLO-119), and remove dead analytics import (SOLO-122).

**Architecture:** Four cleanup tasks that consolidate duplicated code and remove dead imports. SOLO-110 is the foundation — it must be completed first because SOLO-119 depends on it. SOLO-115 is the largest change (consolidating API route into server action). SOLO-122 is a one-line fix. All changes are frontend-only TypeScript refactors.

**Tech Stack:** Next.js 15, Supabase SSR (`@supabase/ssr`), TypeScript

**Linear Epic:** [SOLO-133](https://linear.app/aaron-solo/issue/SOLO-133)

---

## Dependency Graph

```
SOLO-110 (Consolidate server clients)
  └─── SOLO-119 (Fix study action import) — depends on SOLO-110
SOLO-115 (Unify study session paths) — independent
SOLO-122 (Remove dead analytics import) — independent
```

**Recommended execution order:** SOLO-110 → SOLO-119 → SOLO-122 → SOLO-115

---

## Sub-Issue 1: SOLO-110 — Consolidate Duplicate Server Client Modules

**Priority:** 🟠 P2 (High) — DX confusion, import inconsistency  
**Effort:** Low (~15 min)

### Problem

Two nearly identical files both export `createClient()`:
- `utils/supabase/server.ts` (official Supabase pattern, co-located with `client.ts` and `middleware.ts`)
- `lib/supabase/server.ts` (duplicate)

**Current import map:**

| Module | Used By |
|--------|---------|
| `@/utils/supabase/server` | `app/actions/auth.ts`, `app/layout.tsx`, `app/analytics/page.tsx`, `app/api/study/route.ts` |
| `@/lib/supabase/server` | `app/actions/study.ts`, `app/actions/artifacts.ts`, `app/artifacts/page.tsx`, `app/study/page.tsx` |

### Task 1.1: Update All Imports to `@/utils/supabase/server`

**Files:**
- Modify: `app/actions/study.ts:3`
- Modify: `app/actions/artifacts.ts:3`
- Modify: `app/artifacts/page.tsx:2`
- Modify: `app/study/page.tsx:2`

**Step 1: Update each file's import**

In each file, change:
```typescript
import { createClient } from "@/lib/supabase/server";
```
to:
```typescript
import { createClient } from "@/utils/supabase/server";
```

Exact files and line numbers:
- `app/actions/study.ts` — Line 3
- `app/actions/artifacts.ts` — Line 3
- `app/artifacts/page.tsx` — Line 2
- `app/study/page.tsx` — Line 2

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors. All pages still render.

**Step 3: Commit**

```bash
git add app/actions/study.ts app/actions/artifacts.ts app/artifacts/page.tsx app/study/page.tsx
git commit -m "refactor(SOLO-110): consolidate server client imports to @/utils/supabase/server"
```

---

### Task 1.2: Delete the Duplicate Module

**Files:**
- Delete: `lib/supabase/server.ts`
- Potentially delete: `lib/supabase/` directory (if empty after deletion)

**Step 1: Remove the duplicate file**

```bash
rm lib/supabase/server.ts
# If lib/supabase/ is now empty, remove the directory too
rmdir lib/supabase 2>/dev/null || true
```

**Step 2: Verify no remaining references**

Run: `grep -r "@/lib/supabase/server" --include="*.ts" --include="*.tsx" .`
Expected: No results.

**Step 3: Verify build compiles**

Run: `npx next build`
Expected: No errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(SOLO-110): delete duplicate lib/supabase/server.ts"
```

---

## Sub-Issue 2: SOLO-119 — Fix Study Action Import (depends on SOLO-110)

**Priority:** 🟠 P3 (Medium) — Import inconsistency  
**Effort:** Low (~2 min)

### Problem

`app/actions/study.ts` imports from `@/lib/supabase/server` instead of `@/utils/supabase/server`.

### Resolution

> [!NOTE]
> This sub-issue is **automatically resolved** by Task 1.1 of SOLO-110 above. When all imports are consolidated, the study action import is fixed as part of that batch. No separate task needed.

**Verify:** After SOLO-110 is complete, confirm `app/actions/study.ts` line 3 reads:
```typescript
import { createClient } from "@/utils/supabase/server";
```

---

## Sub-Issue 3: SOLO-122 — Remove Dead Import in Analytics Client

**Priority:** 🟡 P4 (Low) — Bundle hygiene  
**Effort:** Low (~2 min)

### Problem

`app/analytics/analytics-client.tsx` imports `AnalyticsExportButton` on line 9 but never renders it. The same component is already imported and rendered in `app/analytics/page.tsx`.

### Current Code

```typescript
// app/analytics/analytics-client.tsx — Line 9
import { AnalyticsExportButton } from '@/components/analytics/analytics-export-button';
// ❌ Never used in the JSX of this file
```

### Task 3.1: Remove the Unused Import

**Files:**
- Modify: `app/analytics/analytics-client.tsx:9`

**Step 1: Delete line 9**

Remove this line from `app/analytics/analytics-client.tsx`:
```typescript
import { AnalyticsExportButton } from '@/components/analytics/analytics-export-button';
```

The resulting imports section should be:
```typescript
'use client';

import { StatsOverview } from '@/components/analytics/stats-overview';
import { StreakWidget } from '@/components/analytics/streak-widget';
import { WeeklyActivityChart } from '@/components/analytics/weekly-activity-chart';
import { MasteryDistributionChart } from '@/components/analytics/mastery-distribution-chart';
import { PerformanceByTopic } from '@/components/analytics/performance-by-topic';
import { ArtifactProgressDetail } from '@/components/analytics/artifact-progress-detail';
import type { MasteryLevel } from '@/components/study/mastery-badge';
```

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add app/analytics/analytics-client.tsx
git commit -m "cleanup(SOLO-122): remove unused AnalyticsExportButton import"
```

---

## Sub-Issue 4: SOLO-115 — Consolidate Dual Study Session Paths

**Priority:** 🟠 P3 (Medium) — Maintenance burden  
**Effort:** Medium (~45 min)

### Problem

Two separate code paths handle study session creation:

| Path | File | Capabilities |
|------|------|-------------|
| Server Action | `app/actions/study.ts` → `logStudySession()` | Simple insert, maps string rating → int, no FSRS |
| API Route | `app/api/study/route.ts` → `POST` handler | Bulk insert, handles FSRS card updates, `any` types |

They have different schemas, different validation, and different capabilities. The Next.js App Router pattern prefers Server Actions for mutations.

### Approach

1. **Upgrade the Server Action** to support all capabilities (bulk insert, FSRS)
2. **Keep the API Route GET** (reading study sessions is fine as a GET endpoint)
3. **Remove the API Route POST** once the Server Action handles everything
4. **Update frontend** to call the server action instead of the API route for POSTs

### Task 4.1: Upgrade the Study Server Action

**Files:**
- Modify: `app/actions/study.ts`

**Step 1: Expand `logStudySession` to support bulk results and FSRS updates**

```typescript
"use server";

import { createClient } from "@/utils/supabase/server";

// Simple single-card study log (existing interface, kept for backward compat)
export async function logStudySession(
  cardId: string,
  ratingStr: "know" | "unsure" | "unknown",
  durationMs: number
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be logged in to log study sessions");
  }

  let rating = 1;
  if (ratingStr === "unsure") rating = 2;
  if (ratingStr === "know") rating = 3;

  const { error } = await supabase
    .from("study_sessions")
    .insert({
      card_id: cardId,
      user_id: user.id,
      rating: rating,
      duration_ms: durationMs,
      state_before: 0,
      state_after: 0,
    });

  if (error) {
    console.error("Failed to insert study session:", error);
    throw new Error(`Failed to log study session: ${error.message}`);
  }
}

// Typed result interface for bulk study sessions
interface StudyResult {
  cardId: string;
  rating: number;
  duration_ms?: number;
  state_before?: number;
  state_after?: number;
  fsrs?: {
    state?: number;
    due?: string;
    stability?: number;
    difficulty?: number;
    elapsed_days?: number;
    scheduled_days?: number;
    reps?: number;
    lapses?: number;
  };
}

// Bulk study session logger with FSRS support
export async function logBulkStudySession(
  artifactId: string,
  mode: string,
  duration: number,
  results: StudyResult[]
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be logged in to log study sessions");
  }

  if (!artifactId || !mode) {
    throw new Error("Artifact ID and mode are required");
  }

  if (!results || results.length === 0) {
    throw new Error("At least one study result is required");
  }

  // Bulk insert study session records
  const sessionRecords = results.map((r) => ({
    user_id: user.id,
    card_id: r.cardId,
    rating: r.rating || 3,
    duration_ms: r.duration_ms || duration || 0,
    state_before: r.state_before || 0,
    state_after: r.state_after || 0,
    reviewed_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("study_sessions")
    .insert(sessionRecords);

  if (insertError) {
    console.error("Error inserting study sessions:", insertError);
    throw new Error(`Failed to log study sessions: ${insertError.message}`);
  }

  // Update FSRS state on cards (only for results that have FSRS data)
  for (const r of results) {
    if (r.cardId && r.fsrs) {
      const { error: updateError } = await supabase
        .from("cards")
        .update({
          fsrs_state: r.fsrs.state ?? r.state_after ?? 0,
          fsrs_due: r.fsrs.due ?? new Date().toISOString(),
          fsrs_stability: r.fsrs.stability ?? 0,
          fsrs_difficulty: r.fsrs.difficulty ?? 0,
          fsrs_elapsed_days: r.fsrs.elapsed_days ?? 0,
          fsrs_scheduled_days: r.fsrs.scheduled_days ?? 0,
          fsrs_reps: r.fsrs.reps ?? 0,
          fsrs_lapses: r.fsrs.lapses ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.cardId);

      if (updateError) {
        console.error(`Failed to update FSRS for card ${r.cardId}:`, updateError);
        // Don't throw — log the error but continue with other cards
      }
    }
  }

  return {
    artifactId,
    mode,
    duration,
    resultsProcessed: results.length,
    completedAt: new Date().toISOString(),
  };
}
```

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add app/actions/study.ts
git commit -m "feat(SOLO-115): add bulk study session action with FSRS support"
```

---

### Task 4.2: Remove POST from API Route

**Files:**
- Modify: `app/api/study/route.ts`

**Step 1: Delete the `POST` export**

Remove the entire `export async function POST(request: NextRequest) { ... }` function (lines 49–130). Keep only the `GET` handler.

The file should contain only:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  // ... existing GET handler unchanged ...
}
```

**Step 2: Search for any callers of `POST /api/study`**

Run: `grep -r "/api/study" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next"`

If any callers are found, update them to use the `logBulkStudySession` server action instead.

**Step 3: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 4: Commit**

```bash
git add app/api/study/route.ts
git commit -m "refactor(SOLO-115): remove POST handler, use server action instead"
```

---

### Task 4.3: Update Frontend Callers

**Step 1: Search for any component that calls `POST /api/study`**

Run: `grep -rn "api/study" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next" | grep -v "route.ts"`

For each caller found, replace the `fetch('/api/study', { method: 'POST', ... })` call with:

```typescript
import { logBulkStudySession } from "@/app/actions/study";

// Replace fetch call with:
await logBulkStudySession(artifactId, mode, duration, results);
```

> [!NOTE]
> The specific files to modify will depend on what the grep search reveals. The study page (`app/study/page.tsx`) is the most likely caller.

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add .
git commit -m "refactor(SOLO-115): update frontend callers to use study server action"
```

---

## Verification Plan

### Automated Tests

No automated frontend tests exist in this project. The `tests/` directory contains only Python backend tests (pytest).

**Build verification (primary automated check):**
```bash
npx next build
```

**Import integrity check:**
```bash
# Verify no remaining references to the deleted duplicate module
grep -r "@/lib/supabase/server" --include="*.ts" --include="*.tsx" .
# Expected: No results
```

### Manual Verification

> [!IMPORTANT]
> All manual verification requires starting the dev server with `npm run dev` and testing in a browser at `http://localhost:3000`.

#### SOLO-110: Consolidated Client Module
1. Start dev server: `npm run dev`
2. Navigate to `/artifacts` — ✅ Page loads, artifacts display correctly
3. Navigate to `/study` — ✅ Page loads, study cards display correctly
4. Navigate to `/analytics` — ✅ Analytics dashboard renders
5. Complete a study session — ✅ `logStudySession` works (session is saved)

#### SOLO-119: Import Consistency
1. Covered by SOLO-110 verification (study page + study action)
2. Additionally, verify: `grep -r "@/lib/supabase" . --include="*.ts" --include="*.tsx"` returns nothing

#### SOLO-122: Dead Import Removed
1. Run: `npx next build` — ✅ No unused import warnings
2. Navigate to `/analytics` — ✅ Page still renders correctly with all charts

#### SOLO-115: Unified Study Session Path
1. Navigate to `/study`
2. Start a study session, answer cards
3. Complete the session — ✅ Session results are saved to database
4. Navigate to `/analytics` — ✅ Study statistics reflect the completed session
5. Check Supabase dashboard → `study_sessions` table — ✅ New records exist

---

## Estimated Time

| Sub-Issue | Task | Estimated Time |
|-----------|------|---------------|
| SOLO-110 | Update 4 imports | 5 min |
| SOLO-110 | Delete duplicate module | 3 min |
| SOLO-119 | (Resolved by SOLO-110) | 0 min |
| SOLO-122 | Remove dead import | 2 min |
| SOLO-115 | Upgrade server action | 15 min |
| SOLO-115 | Remove API route POST | 5 min |
| SOLO-115 | Update frontend callers | 15 min |
| — | Build verification + manual testing | 15 min |
| **Total** | | **~60 min** |
