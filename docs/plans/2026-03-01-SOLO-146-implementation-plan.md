# SOLO-146 Study Action Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Zod-based input validation to `logStudySession` and `logBulkStudySession` server actions to ensure data integrity.

**Architecture:** Centralize validation logic in `lib/validations/study.ts`. Integrate these schemas into existing server actions in `app/actions/study.ts` using a "validate-then-execute" pattern.

**Tech Stack:** Next.js Server Actions, Zod, TypeScript, Supabase.

---

### Task 1: Create Study Validation Schemas

**Files:**
- Create: `lib/validations/study.ts`

**Step 1: Write the implementation**

```typescript
import { z } from "zod";

export const fsrsSchema = z.object({
  state: z.number().int().nonnegative().optional(),
  due: z.string().datetime().optional(),
  stability: z.number().nonnegative().optional(),
  difficulty: z.number().nonnegative().optional(),
  elapsed_days: z.number().int().nonnegative().optional(),
  scheduled_days: z.number().int().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  lapses: z.number().int().nonnegative().optional(),
});

export const studyRatingSchema = z.union([
  z.literal("know"),
  z.literal("unsure"),
  z.literal("unknown"),
]);

export const logStudySessionSchema = z.object({
  cardId: z.string().uuid("Invalid card ID"),
  ratingStr: studyRatingSchema,
  durationMs: z.number().int().nonnegative(),
});

export const studyResultSchema = z.object({
  cardId: z.string().uuid("Invalid card ID"),
  rating: z.number().int().min(1).max(4),
  duration_ms: z.number().int().nonnegative().optional(),
  state_before: z.number().int().nonnegative().optional(),
  state_after: z.number().int().nonnegative().optional(),
  fsrs: fsrsSchema.optional(),
});

export const logBulkStudySessionSchema = z.object({
  artifactId: z.string().uuid("Invalid artifact ID"),
  mode: z.string().min(1, "Mode is required"),
  duration: z.number().int().nonnegative(),
  results: z.array(studyResultSchema).min(1, "At least one study result is required"),
});

export type LogStudySessionInput = z.infer<typeof logStudySessionSchema>;
export type LogBulkStudySessionInput = z.infer<typeof logBulkStudySessionSchema>;
export type StudyResultInput = z.infer<typeof studyResultSchema>;
```

**Step 2: Commit**

```bash
git add lib/validations/study.ts
git commit -m "feat: add study validation schemas"
```

---

### Task 2: Validate `logStudySession` Action

**Files:**
- Modify: `app/actions/study.ts`

**Step 1: Add validation to `logStudySession`**

```typescript
// Add import at the top
import { logStudySessionSchema } from "@/lib/validations/study";

// Update logStudySession
export async function logStudySession(
  cardId: string,
  ratingStr: "know" | "unsure" | "unknown",
  durationMs: number
) {
  // 1. Validate input
  logStudySessionSchema.parse({ cardId, ratingStr, durationMs });

  const supabase = await createClient();
  // ... rest of the function remains the same
```

**Step 2: Commit**

```bash
git add app/actions/study.ts
git commit -m "feat: add validation to logStudySession action"
```

---

### Task 3: Validate `logBulkStudySession` Action

**Files:**
- Modify: `app/actions/study.ts`

**Step 1: Add validation and refactor `logBulkStudySession` to use validated data**

```typescript
// Add import
import { logBulkStudySessionSchema } from "@/lib/validations/study";

// Update logBulkStudySession
export async function logBulkStudySession(
  artifactId: string,
  mode: string,
  duration: number,
  results: any[]
) {
  // 1. Validate input
  const validated = logBulkStudySessionSchema.parse({
    artifactId,
    mode,
    duration,
    results,
  });

  const supabase = await createClient();
  // ... use validated.results and validated.duration instead of original args
```

**Step 2: Commit**

```bash
git add app/actions/study.ts
git commit -m "feat: add validation to logBulkStudySession action"
```

---

### Task 4: Verification

**Step 1: Run type check**

Run: `pnpm tsc --noEmit`
Expected: PASS

**Step 2: Manual verification (or automated if possible)**
Create a temporary script to call the actions with invalid data and verify they throw ZodErrors.

**Step 3: Final Commit**

```bash
git commit -m "test: verify study action validation"
```
