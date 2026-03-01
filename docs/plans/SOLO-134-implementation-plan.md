# SOLO-134: Tech Debt/Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up 8 active tech debt items across frontend and backend: fix `any` types, remove dead code, harden auth context, guard API client, and env-configure CORS.

**Architecture:** Minimal, focused edits across 7 files. No new features — purely cleanup and hardening. 4 independent tasks ordered by risk (lowest first).

**Tech Stack:** Next.js (TypeScript), FastAPI (Python), Supabase

---

## Pre-Resolved Issues (No Action Needed)

The following sub-issues were resolved in prior PRs and require **no changes**:

| Sub-Issue | Evidence |
|-----------|----------|
| **I1** (SOLO-110): Duplicate server client | `lib/supabase/server.ts` deleted; no imports remain |
| **I8** (SOLO-111): Middleware auth route gap | `utils/supabase/middleware.ts` already uses single `publicRoutes` array |
| **N4** (SOLO-119): Study action duplicate client | `app/actions/study.ts` imports from `@/utils/supabase/server` |
| **N5** (SOLO-122): Dead import in analytics client | `AnalyticsExportButton` no longer imported in `analytics-client.tsx` |
| **I3** (SOLO-115): Dual study session paths | API route is GET-only (read); Server Action handles writes — clean separation |

---

## Task 1: Fix `any` Type Assertions (SOLO-117, SOLO-120)

**~5 minutes**

**Files:**
- Modify: `app/artifacts/page.tsx:23`
- Modify: `app/study/page.tsx:29`
- Modify: `app/analytics/page.tsx:45`

**Step 1: Define card type inline in `app/artifacts/page.tsx`**

Replace line 23:
```typescript
// Before
qaPairs: (artifact.cards || []).map((card: any) => ({

// After — use inline type matching the Supabase `cards` table columns
qaPairs: (artifact.cards || []).map((card: { question: string; answer: string; source_context: string | null; judge_score: number | null; judge_feedback: string | null }) => ({
```

**Step 2: Define card type inline in `app/study/page.tsx`**

Replace line 29:
```typescript
// Before
(artifact.cards || []).map((card: any) => ({

// After
(artifact.cards || []).map((card: { id: string; question: string; answer: string; source_context: string | null; judge_score: number | null }) => ({
```

**Step 3: Fix residual `any` in `app/analytics/page.tsx`**

Replace on line 45:
```typescript
// Before
value: masteryRes.data?.data?.find((d: any) => d.level === 'mastered')?.count || 0,

// After
value: masteryRes.data?.data?.find((d: { level: string; count: number }) => d.level === 'mastered')?.count || 0,
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors introduced.

**Step 5: Commit**

```bash
git add app/artifacts/page.tsx app/study/page.tsx app/analytics/page.tsx
git commit -m "fix(types): replace any type assertions with proper interfaces (SOLO-117, SOLO-120)"
```

---

## Task 2: Remove Dead Code & Relocate Mock Data (SOLO-121, SOLO-118)

**~5 minutes**

**Files:**
- Modify: `app/analytics/page.tsx:97-106`
- Move: `lib/mock-analytics-data.ts` → `tests/fixtures/mock-analytics-data.ts`
- Move: `lib/analytics-test-scenarios.ts` → `tests/fixtures/analytics-test-scenarios.ts`
- Modify: `tests/fixtures/analytics-test-scenarios.ts:1` (update import path)

**Step 1: Remove dead ternary in analytics page**

Replace lines 97-106 in `app/analytics/page.tsx`:
```tsx
// Before
{analyticsData ? (
  <AnalyticsClient data={analyticsData} />
) : (
  <div className="text-center py-12">
    <p className="text-muted-foreground">No analytics data available yet.</p>
    <p className="text-sm text-muted-foreground mt-2">
      Start creating artifacts and studying to see your progress.
    </p>
  </div>
)}

// After — analyticsData is always truthy (object literal)
<AnalyticsClient data={analyticsData} />
```

**Step 2: Move mock data files to `tests/fixtures/`**

```bash
mkdir -p tests/fixtures
git mv lib/mock-analytics-data.ts tests/fixtures/mock-analytics-data.ts
git mv lib/analytics-test-scenarios.ts tests/fixtures/analytics-test-scenarios.ts
```

**Step 3: Update import in relocated test scenarios file**

In `tests/fixtures/analytics-test-scenarios.ts` line 1:
```typescript
// Before
import type { AnalyticsData } from './mock-analytics-data';

// After (relative path within same directory — no change needed)
import type { AnalyticsData } from './mock-analytics-data';
```

Since both files move to the same directory, the relative import remains valid. No change needed.

**Step 4: Verify no remaining imports of mock data in production code**

Run: `grep -r "mock-analytics-data\|analytics-test-scenarios" --include="*.ts" --include="*.tsx" app/ components/ lib/ utils/`
Expected: No results (zero production imports).

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove dead code and relocate mock data to tests/ (SOLO-121, SOLO-118)"
```

---

## Task 3: Harden Auth Context & API Client (SOLO-124, SOLO-125)

**~10 minutes**

**Files:**
- Modify: `components/auth/auth-context.tsx`
- Modify: `lib/api-client.ts`

### Task 3a: Add `onAuthStateChange` to AuthContext (SOLO-124)

**Step 1: Update `auth-context.tsx`**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  user: initialUser,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: false,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

**Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add components/auth/auth-context.tsx
git commit -m "fix(auth): subscribe to onAuthStateChange for real-time session sync (SOLO-124)"
```

### Task 3b: Guard API Client for Client-Only Use (SOLO-125)

**Step 1: Add server-side guard to `lib/api-client.ts`**

Add at the top of the file (after the JSDoc comment, before the class):
```typescript
/**
 * IMPORTANT: This module uses module-level mutable state for token management.
 * It must ONLY be imported in client-side code ('use client' components).
 * Importing in Server Components or API routes risks token leakage between requests.
 */
if (typeof window === "undefined") {
  console.warn(
    "[api-client] WARNING: api-client.ts was imported in a server context. " +
    "Module-level mutable state (_accessToken, _refreshFn) is unsafe server-side. " +
    "Only import this module in 'use client' components."
  );
}
```

**Step 2: Verify no server-side imports of api-client**

Run: `grep -rn "api-client" --include="*.ts" --include="*.tsx" app/actions/ app/api/`
Expected: No results (not imported in server actions or API routes).

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add lib/api-client.ts
git commit -m "fix(security): add server-side import guard to api-client (SOLO-125)"
```

---

## Task 4: CORS Environment Configuration (SOLO-128)

**~5 minutes**

**Files:**
- Modify: `src/note_taker/api/main.py`
- Test: `tests/api/test_main.py` (if exists) or verify manually

**Step 1: Update CORS to read from environment**

```python
import os

# Configure CORS for Next.js frontend
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in cors_origins_str.split(",")]
```

This keeps `http://localhost:3000` as the default for local development, while allowing production to set `CORS_ORIGINS=https://active-recall-generator.vercel.app,http://localhost:3000`.

**Step 2: Add `CORS_ORIGINS` to `.env.example`**

```bash
echo 'CORS_ORIGINS=http://localhost:3000' >> .env.example
```

**Step 3: Verify Python tests still pass**

Run: `uv run pytest tests/ -v --tb=short`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/note_taker/api/main.py .env.example
git commit -m "refactor(cors): load CORS origins from environment variable (SOLO-128)"
```

---

## Verification Plan

### Automated Tests

1. **TypeScript compilation** (covers Tasks 1, 2, 3):
   ```bash
   npx tsc --noEmit
   ```
   Expected: Zero errors.

2. **Next.js production build** (covers all frontend changes):
   ```bash
   npm run build
   ```
   Expected: Build succeeds with no errors.

3. **Python test suite** (covers Task 4):
   ```bash
   uv run pytest tests/ -v --tb=short
   ```
   Expected: All existing tests pass.

4. **No production imports of mock data** (covers Task 2):
   ```bash
   grep -r "mock-analytics-data\|analytics-test-scenarios" --include="*.ts" --include="*.tsx" app/ components/ lib/ utils/
   ```
   Expected: No results.

### Manual Verification

> [!IMPORTANT]
> After all tasks are complete, visually verify these pages in the browser at `http://localhost:3000`:

1. **Analytics page** (`/analytics`): Charts render correctly, no console errors
2. **Artifacts page** (`/artifacts`): Cards list displays properly
3. **Study page** (`/study`): Cards load and study session works
4. Open browser DevTools → Console: No unexpected warnings (the `api-client` warning should only appear if accidentally imported server-side)
