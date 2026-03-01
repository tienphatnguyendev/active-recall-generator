# Full-Stack Code Review: Active Recall Generator

> **Date**: 2026-02-28  
> **Scope**: Frontend (Next.js), Backend (FastAPI), Supabase (Postgres, RLS, RPCs)  
> **Verdict**: Functional foundation in place, but several **Critical** and **Important** issues must be addressed before production readiness.

---

## Executive Summary

The application has a well-structured Supabase schema with proper RLS policies, a clean server-component data flow for artifacts/study pages, and solid Pydantic models in the Python backend. However, the review uncovered:

| Severity | Count | Areas |
|----------|-------|-------|
| 🔴 Critical | 2 | Security (auth bypass, input validation) |
| 🟠 Important | 8 | Architecture, performance, code quality |
| 🟡 Minor | 6 | Cleanup, DX, polish |
| 🔵 New (code review) | 5 | RPC ordering, dead code, type safety, import hygiene |

---

## 🔴 Critical Issues

### C4. No Server-Side Input Validation in Auth Actions

**File**: [auth.ts](file:///Users/aaronng/repos/note-taker/app/actions/auth.ts)

The `login` and `register` server actions perform no validation before passing data to Supabase:

```typescript
// ❌ No validation — email/password cast directly from FormData
const email = formData.get("email") as string;
const password = formData.get("password") as string;
```

- No email format validation
- No password length/complexity enforcement (frontend says "8 chars" but the Supabase config allows 6; the server action enforces neither)
- No null/undefined checks — `formData.get()` can return `null` if the field is missing
- The `name` field in `register` is not validated either

**Fix**: Add Zod or manual validation:

```typescript
export async function register(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");
  
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return { error: "Valid email is required" };
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  // ... proceed
}
```

---

### C5. Export API Routes Are Stub-Only — No Auth Verification

**Files**: [export/route.ts](file:///Users/aaronng/repos/note-taker/app/api/artifacts/export/route.ts), [[id]/export/route.ts](file:///Users/aaronng/repos/note-taker/app/api/artifacts/%5Bid%5D/export/route.ts)

Both export routes check for a Bearer token but never verify it with Supabase. They also return empty stub data:

```typescript
// ❌ Token is checked for presence but never validated
const token = request.headers.get('authorization')?.split('Bearer ')[1];
if (!token) { return 401; }
// No supabase.auth.getUser() call — any non-empty string passes
```

Anyone with a random string as a Bearer token gets a 200 OK. The per-artifact export doesn't verify ownership either (the `TODO` comment acknowledges this).

---

## 🟠 Important Issues

### I1. Duplicate Supabase Server Client Modules

**Files**: [utils/supabase/server.ts](file:///Users/aaronng/repos/note-taker/utils/supabase/server.ts) and [lib/supabase/server.ts](file:///Users/aaronng/repos/note-taker/lib/supabase/server.ts)

These two files are **nearly identical**, both exporting an `async function createClient()` that creates a cookie-based Supabase server client. Different parts of the codebase import from different paths:

| Import source | Used by |
|---|---|
| `@/utils/supabase/server` | `auth.ts`, `layout.tsx` |
| `@/lib/supabase/server` | `artifacts.ts` (action), `study.ts` (action), `artifacts/page.tsx`, `study/page.tsx` |

**Fix**: Consolidate to a single module. The `utils/supabase/` directory follows the official Supabase Next.js pattern and already contains `client.ts` and `middleware.ts`, so keep that one and update all imports.

---

### I2. N+1 Card Update Pattern in Study Session POST

**File**: [study/route.ts](file:///Users/aaronng/repos/note-taker/app/api/study/route.ts#L128-L145)

```typescript
// ❌ Sequential updates in a loop — N+1 pattern
for (const r of results) {
  if (r.cardId && r.fsrs) {
    await supabase
      .from('cards')
      .update({ /* FSRS fields */ })
      .eq('id', r.cardId);
  }
}
```

For a study session reviewing 20+ cards, this generates 20+ individual UPDATE queries sequentially.

**Fix**: Use Supabase's `upsert()` with an array, or batch the updates via a single RPC call.

---

### I3. Inconsistent Data Path — Dual Server Action + API Route for Study Sessions

**Files**: [actions/study.ts](file:///Users/aaronng/repos/note-taker/app/actions/study.ts) and [api/study/route.ts](file:///Users/aaronng/repos/note-taker/app/api/study/route.ts)

Both a Server Action (`logStudySession`) and an API route (`POST /api/study`) handle study session creation. They have different schemas, different validation logic, and different capabilities (the API route handles FSRS updates; the server action does not).

**Fix**: Consolidate to one canonical path. Server Actions are preferred for mutations in the App Router pattern.

---

### I4. Generate Page Is Client-Side Simulation Only

**File**: [page.tsx](file:///Users/aaronng/repos/note-taker/app/page.tsx)

The main "Generate" page simulates the pipeline with `setTimeout` calls — it never contacts the Python backend. The `usePipelineSSE` hook exists in `hooks/` but is never connected.

```typescript
// The entire pipeline is faked with sleep()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const runSimulation = async (chunks: number) => {
  // ...entirely client-side simulation
};
```

The UI text also references "SQLite" storage ("Artifacts are stored in SQLite with deduplication") which is stale — the app now uses Supabase.

---

### I5. Missing Database Indexes

**File**: [init_schema.sql](file:///Users/aaronng/repos/note-taker/supabase/migrations/20260227152105_init_schema.sql)

No indexes are created beyond primary keys. The following queries will degrade with scale:

| Query Pattern | Used In | Missing Index |
|---|---|---|
| `WHERE user_id = ?` | `artifacts`, `study_sessions` RLS | `idx_artifacts_user_id`, `idx_study_sessions_user_id` |
| `WHERE artifact_id = ?` | `cards` RLS, JOIN queries | `idx_cards_artifact_id` |
| `WHERE card_id = ?` | `study_sessions` | `idx_study_sessions_card_id` |
| `(reviewed_at AT TIME ZONE 'UTC')::DATE` | RPCs | Functional index on `reviewed_at` |

**Fix**: Add indexes in a new migration:

```sql
CREATE INDEX idx_artifacts_user_id ON public.artifacts(user_id);
CREATE INDEX idx_cards_artifact_id ON public.cards(artifact_id);
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_card_id ON public.study_sessions(card_id);
CREATE INDEX idx_study_sessions_reviewed_at ON public.study_sessions((reviewed_at AT TIME ZONE 'UTC')::DATE);
```

---

### I6. `any` Type Usage Across Frontend

Multiple files use `any` type assertions, weakening TypeScript safety:

| File | Line | Usage |
|---|---|---|
| [artifacts/page.tsx](file:///Users/aaronng/repos/note-taker/app/artifacts/page.tsx#L23) | 23 | `(card: any) =>` |
| [study/page.tsx](file:///Users/aaronng/repos/note-taker/app/study/page.tsx#L29) | 29 | `(card: any) =>` |
| [study/route.ts](file:///Users/aaronng/repos/note-taker/app/api/study/route.ts#L108) | 108 | `results.map((r: any) =>` |
| [analytics/page.tsx](file:///Users/aaronng/repos/note-taker/app/analytics/page.tsx#L45) | 45 | `(d: any) => d.level` |

**Fix**: Generate Supabase types with `supabase gen types typescript` and use them throughout.

---

### I7. Mock Analytics Data Still Shipped in Production Bundle

**File**: [mock-analytics-data.ts](file:///Users/aaronng/repos/note-taker/lib/mock-analytics-data.ts) (450 lines, 12KB)

This file exports `MOCK_ANALYTICS_DATA` with hardcoded fake data. While it's no longer imported by the analytics page (which now uses the RPC-backed API), it's still in the codebase and may be tree-shaken but could also be accidentally re-imported.

**Fix**: Move to `tests/` or `__mocks__/` directory, or delete if no longer needed.

---

### I8. Middleware Auth Gap — `/forgot-password` and `/reset-password` Not Fully Protected

**File**: [middleware.ts](file:///Users/aaronng/repos/note-taker/utils/supabase/middleware.ts#L38-L48)

The `isAuthRoute` check includes `/forgot-password` and `/reset-password`, but the redirect-to-login check only excludes `/login`, `/register`, and `/`. This means unauthenticated users can access `/forgot-password` and `/reset-password` (which is correct behavior), but the logic is fragile because the two checks are defined separately with different lists.

```typescript
// ❌ Two separate, manually-maintained lists for the same concept
const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/register') ||
                    request.nextUrl.pathname.startsWith('/forgot-password') ||
                    request.nextUrl.pathname.startsWith('/reset-password');

if (!user && 
    !request.nextUrl.pathname.startsWith('/login') && 
    !request.nextUrl.pathname.startsWith('/register') && 
    request.nextUrl.pathname !== '/') {
  // forgot-password and reset-password get redirected to /login! ❌
```

**Fix**: Refactor to use a single `publicRoutes` array:

```typescript
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const isPublicRoute = publicRoutes.some(r => request.nextUrl.pathname.startsWith(r));
```

---

## 🟡 Minor Issues

### M2. updated_at Column Never Auto-Updated

**File**: [init_schema.sql](file:///Users/aaronng/repos/note-taker/supabase/migrations/20260227152105_init_schema.sql#L15)

The `artifacts.updated_at` and `cards.updated_at` columns have a `DEFAULT` but no trigger to auto-update on row modification. Without a trigger, `updated_at` will remain at the creation time forever.

### M3. `AuthContext` Is Static — No Real-Time Session Sync

**File**: [auth-context.tsx](file:///Users/aaronng/repos/note-taker/components/auth/auth-context.tsx)

The `AuthProvider` receives the user from the server layout render but never subscribes to `onAuthStateChange`. If a session expires mid-use, the UI will show the user as authenticated until a full page reload.

### M4. API Client Module (`lib/api-client.ts`) Uses Module-Level Mutable State

**File**: [api-client.ts](file:///Users/aaronng/repos/note-taker/lib/api-client.ts)

```typescript
let _accessToken: string | null = null;
let _refreshFn: RefreshFn | null = null;
```

Module-level mutable state is shared across all users in server-side rendering, which could cause token leakage between requests. This module should only be used client-side.

### M5. FastAPI Backend Is a Skeleton — Only `/health` Route

**Files**: [api/main.py](file:///Users/aaronng/repos/note-taker/src/note_taker/api/main.py), [api/routes.py](file:///Users/aaronng/repos/note-taker/src/note_taker/api/routes.py)

The backend has CORS configured and is deployed to Render, but only serves a `/health` endpoint. The frontend never calls it. This is expected WIP but should be tracked.

### M6. Python `DatabaseManager` Uses Local SQLite — Disconnected from Supabase

**File**: [database.py](file:///Users/aaronng/repos/note-taker/src/note_taker/database.py)

The CLI/pipeline backend still uses a local SQLite file (`.note-taker.db`), completely separate from the Supabase Postgres database that the frontend uses. Generated artifacts from the CLI never appear in the web UI.

### M7. CORS Hardcoded Origins

**File**: [api/main.py](file:///Users/aaronng/repos/note-taker/src/note_taker/api/main.py#L12-L15)

```python
origins = [
    "http://localhost:3000",
    "https://active-recall-generator.vercel.app",
]
```

Should be loaded from environment variables for deploy flexibility.

---

## 🔵 New Issues (2026-03-01 Code Review)

### N1. `get_mastery_distribution` RPC Returns Unordered `jsonb_agg`

**Severity**: Medium  
**Location**: [20260301000000_fix_rpc_security.sql](file:///Users/aaronng/repos/note-taker/supabase/migrations/20260301000000_fix_rpc_security.sql#L138-L141)

The `jsonb_agg` in the `get_mastery_distribution` RPC has no `ORDER BY` clause. The `unnest(ARRAY['mastered', 'reviewing', 'learning', 'new'])` in the `levels` CTE also does not guarantee order after the `LEFT JOIN`. This means the mastery level array in the response may arrive in arbitrary order, causing inconsistent chart rendering on the frontend.

**Recommended Action**: Add `ORDER BY` to the `jsonb_agg`:
```sql
SELECT jsonb_agg(
    jsonb_build_object('level', l.level, 'count', COALESCE(cs.cnt, 0))
    ORDER BY CASE l.level WHEN 'mastered' THEN 1 WHEN 'reviewing' THEN 2 WHEN 'learning' THEN 3 WHEN 'new' THEN 4 END
) INTO v_result
```

---

### N2. Residual `any` Type in Fixed Analytics Page

**Severity**: Low  
**Location**: [analytics/page.tsx#L45](file:///Users/aaronng/repos/note-taker/app/analytics/page.tsx#L45)

```typescript
value: masteryRes.data?.data?.find((d: any) => d.level === 'mastered')?.count || 0,
```

The C3 fix correctly converted the page to a Server Component, but left one `any` type assertion. This should use the `MasteryLevel` type already defined in `analytics-client.tsx`.

**Recommended Action**: Type `d` as `{ level: string; count: number }` or import the proper type.

---

### N3. Dead-Code Null Check in Analytics Page

**Severity**: Low  
**Location**: [analytics/page.tsx#L97-L106](file:///Users/aaronng/repos/note-taker/app/analytics/page.tsx#L97-L106)

```typescript
{analyticsData ? (
  <AnalyticsClient data={analyticsData} />
) : (
  <div>No analytics data available yet.</div>  // ← never reached
)}
```

`analyticsData` is an object literal constructed on L36–68 — it is always truthy (even with all zeros/empty arrays). The `null` fallback branch is dead code.

**Recommended Action**: Remove the ternary and render `<AnalyticsClient>` directly. If a "no data" state is desired, check for meaningful content (e.g., `masteryDistribution.totalCards === 0`).

---

### N4. `study.ts` Server Action Imports from Duplicate Client Module

**Severity**: Medium  
**Location**: [actions/study.ts#L3](file:///Users/aaronng/repos/note-taker/app/actions/study.ts#L3)

```typescript
import { createClient } from "@/lib/supabase/server";
```

While the C1 fix consolidated API routes to use `@/utils/supabase/server`, the `logStudySession` server action still imports from the duplicate `@/lib/supabase/server` (issue I1). This is not a bug (both modules are functionally identical), but it perpetuates the import inconsistency that I1 describes.

**Recommended Action**: Update the import to `@/utils/supabase/server` when consolidating I1.

---

### N5. `AnalyticsExportButton` Imported in Both Page and Client Component

**Severity**: Low  
**Location**: [analytics/page.tsx#L4](file:///Users/aaronng/repos/note-taker/app/analytics/page.tsx#L4) and [analytics-client.tsx#L9](file:///Users/aaronng/repos/note-taker/app/analytics/analytics-client.tsx#L9)

`AnalyticsExportButton` is imported in both `page.tsx` and `analytics-client.tsx`. In `page.tsx` it is rendered on L88. In `analytics-client.tsx` it is imported but **not rendered** in the JSX — it's a dead import that increases the client bundle unnecessarily.

**Recommended Action**: Remove the unused import from `analytics-client.tsx`.

---

## Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 P0 | C5: Export routes never verify token | Low | Auth bypass |
| 🔴 P1 | C4: No server-side input validation | Medium | Injection/abuse risk |
| 🟠 P2 | I1: Duplicate server client modules | Low | DX confusion, import inconsistency |
| 🟠 P2 | I8: Middleware auth route gap | Low | Forgot-password redirect bug |
| 🟠 P2 | I5: Missing database indexes | Low | Performance at scale |
| 🟠 P2 | I2: N+1 card updates | Medium | Performance bottleneck |
| 🟠 P2 | N1: Unordered RPC `jsonb_agg` | Low | Inconsistent chart rendering |
| 🟠 P3 | I3: Dual study session paths | Medium | Maintenance burden |
| 🟠 P3 | I4: Generate page simulation | High | Feature gap |
| 🟠 P3 | I6: `any` types | Medium | Type safety |
| 🟠 P3 | I7: Mock data in production | Low | Bundle hygiene |
| 🟠 P3 | N4: Study action uses duplicate client | Low | Import inconsistency |
| 🟡 P4 | N2: Residual `any` in analytics page | Low | Type safety |
| 🟡 P4 | N3: Dead-code null check | Low | Code clarity |
| 🟡 P4 | N5: Dead import in analytics client | Low | Bundle hygiene |
| 🟡 P4 | M2-M7 | Low each | Polish and hardening |

---

## Architecture Scores

| Layer | Score | Notes |
|-------|-------|-------|
| **Supabase Schema & RLS** | 8/10 | Proper FK cascades. Fixed RPC security/leaks. Missing indexes and `updated_at` triggers. |
| **Frontend (Next.js)** | 8/10 | Excellent use of server components (Analytics, Artifacts, Study). Fixed auth-header fetch issues. Duplicate Supabase client imports remaining. |
| **API Routes** | 6/10 | Consistently using SSR client. Redundant analytics route removed. Stub exports and N+1 queries remaining. |
| **Server Actions** | 6/10 | Clean for artifacts/auth but missing validation. Duplicate study session path. |
| **Python Backend** | 5/10 | Solid LLM/pipeline architecture but completely disconnected from Supabase. Skeleton API. |
| **Overall** | 6.5/10 | Significant security and architectural improvements with SSR. Ready for input validation and performance tuning. |
