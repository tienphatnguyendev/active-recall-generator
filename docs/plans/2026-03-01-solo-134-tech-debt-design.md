# SOLO-134: Tech Debt/Cleanup — Design Document

> **Date**: 2026-03-01
> **Issue**: [SOLO-134](https://linear.app/aaron-solo/issue/SOLO-134/tech-debtcleanup)
> **Scope**: Frontend (Next.js), Backend (FastAPI)

---

## Problem Statement

SOLO-134 consolidates 12 tech debt sub-issues identified during code review. After investigation, **3 sub-issues are already resolved**, leaving **9 active items** spanning type safety, dead code removal, auth state management, CORS configuration, and study session path consolidation.

## Current State Assessment

| Sub-Issue | Status | Notes |
|-----------|--------|-------|
| I1: Duplicate server client (SOLO-110) | ✅ Already resolved | `lib/supabase/server.ts` deleted, all imports use `@/utils/supabase/server` |
| I8: Middleware auth route gap (SOLO-111) | ✅ Already resolved | Uses single `publicRoutes` array in `middleware.ts` |
| N4: Study action duplicate client (SOLO-119) | ✅ Already resolved | `actions/study.ts` already imports from `@/utils/supabase/server` |
| I3: Dual study session paths (SOLO-115) | 🔶 Partially resolved | API route is now GET-only (read); Server Action handles writes. Clean separation already exists. |
| I6: `any` types (SOLO-117) | 🔴 Active | 3 files: `artifacts/page.tsx`, `study/page.tsx`, `analytics/page.tsx` |
| N2: Residual `any` in analytics (SOLO-120) | 🔴 Active | `(d: any) => d.level` on L45 of `analytics/page.tsx` |
| N3: Dead-code null check (SOLO-121) | 🔴 Active | `analyticsData` ternary on L97-106 of `analytics/page.tsx` |
| N5: Dead import in analytics client (SOLO-122) | ✅ Already resolved | `AnalyticsExportButton` is no longer imported in `analytics-client.tsx` |
| I7: Mock data in production (SOLO-118) | 🔴 Active | `lib/mock-analytics-data.ts` + `lib/analytics-test-scenarios.ts` still in `lib/` |
| M3: Static AuthContext (SOLO-124) | 🔴 Active | No `onAuthStateChange` subscription |
| M4: API Client mutable state (SOLO-125) | 🔴 Active | Module-level `_accessToken`/`_refreshFn` |
| M7: CORS hardcoded origins (SOLO-128) | 🔴 Active | Origins hardcoded in `api/main.py` |

## Approach

Group the remaining 8 active items into **4 tasks**, ordered by dependency:

1. **Task 1 — Type Safety** (I6 + N2): Replace `any` types with proper interfaces in 3 files.
2. **Task 2 — Dead Code Cleanup** (N3 + I7): Remove dead ternary, relocate mock data files.
3. **Task 3 — Auth & Client Hardening** (M3 + M4): Add `onAuthStateChange`, guard API client for client-only use.
4. **Task 4 — CORS Environment Config** (M7): Load CORS origins from environment variable.

**Design principles:**
- Each task is independently deployable
- Changes are minimal and focused — no scope creep
- TDD where applicable (Python changes)

## Verification Plan

- **TypeScript**: `npx tsc --noEmit` must pass with zero errors
- **Build**: `npm run build` must succeed
- **Python**: `uv run pytest` must pass
- **Manual**: Visual spot-check of analytics, artifacts, and study pages in browser
