# Implementation Plan: I6 — `any` Type Usage Across Frontend

## Issue Summary

Multiple frontend files use `any` type annotations, weakening TypeScript's compile-time safety. This makes refactoring risky and hides potential data shape mismatches between Supabase responses and component props.

## Technical Approach

Generate Supabase TypeScript types using the CLI, then replace all `any` usages with proper types derived from the database schema.

## Implementation Steps

### Step 1: Generate Supabase types (5 min)

```bash
supabase gen types typescript --local > lib/database.types.ts
```

### Step 2: Create helper type aliases (10 min)

**Dependencies**: Step 1

In `lib/database.types.ts` or a new `lib/types.ts`:

```typescript
import type { Database } from './database.types';

export type Artifact = Database['public']['Tables']['artifacts']['Row'];
export type Card = Database['public']['Tables']['cards']['Row'];
export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
export type ArtifactWithCards = Artifact & { cards: Card[] };
```

### Step 3: Replace `any` in pages and routes (20 min)

**Dependencies**: Step 2

| File | Change |
|------|--------|
| `app/artifacts/page.tsx:23` | `(card: any)` → `(card: Card)` |
| `app/study/page.tsx:29` | `(card: any)` → `(card: Card)` |
| `app/api/study/route.ts:108` | `(r: any)` → Define `StudyResultInput` interface |
| `app/api/analytics/route.ts:51` | `(d: any)` → `(d: { level: string; count: number })` |

### Step 4: Verify (5 min)

```bash
pnpm build  # Strict type checking
```

## Acceptance Criteria

- [ ] `lib/database.types.ts` generated and up-to-date
- [ ] No `any` usage in page/route files
- [ ] `pnpm build` passes with no type errors
- [ ] ESLint `@typescript-eslint/no-explicit-any` rule enabled (optional)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Generated types out of sync with production | Medium | Add `supabase gen types` to CI pipeline |
| Type mismatches discovered | Medium | Fix the underlying data shape issues |

**Rollback**: Revert to `any` types.

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~40 minutes
- **Dependencies**: Supabase CLI
