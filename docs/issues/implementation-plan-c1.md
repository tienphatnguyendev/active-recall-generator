# Implementation Plan: C1 — Analytics API Route Bypasses RLS via Raw Supabase Client

## Issue Summary

The API routes at `app/api/analytics/route.ts` and `app/api/study/route.ts` create Supabase clients using the vanilla `@supabase/supabase-js` SDK with manually injected Bearer tokens, instead of using the SSR-aware `@supabase/ssr` helpers. This bypasses the cookie-based auth pattern used elsewhere, creating a fragile and inconsistent auth chain that could allow RLS policy drift.

## Technical Approach

Replace the raw `createClient` calls with the project's existing SSR-aware server client at `utils/supabase/server.ts`. Since these are Next.js API Route Handlers (not Server Components), the SSR cookie-based client works correctly. Remove all manual token extraction and header injection.

## Implementation Steps

### Step 1: Update `app/api/analytics/route.ts` (15 min)

**Dependencies**: None

1. Replace the import:
```diff
-import { createClient } from '@supabase/supabase-js';
+import { createClient } from '@/utils/supabase/server';
```

2. Replace the client creation and auth check:
```diff
-const authHeader = request.headers.get('authorization');
-const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
-if (!token) {
-  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
-}
-const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
-const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
-const supabase = createClient(supabaseUrl, supabaseKey, {
-  global: { headers: { Authorization: `Bearer ${token}` } }
-});
+const supabase = await createClient();
```

3. Keep the existing `supabase.auth.getUser()` call for user verification.

### Step 2: Update `app/api/study/route.ts` (15 min)

**Dependencies**: None (can be done in parallel with Step 1)

Apply the same pattern to both the `GET` and `POST` handlers. Remove the duplicated Supabase client initialization in both functions.

### Step 3: Verify auth flow end-to-end (15 min)

**Dependencies**: Steps 1–2

1. Start dev server: `pnpm dev`
2. Log in via `/login`
3. Navigate to `/analytics` — verify data loads
4. Submit a study session — verify it persists
5. Check browser Network tab: confirm no 401 errors

## Acceptance Criteria

- [ ] No imports from `@supabase/supabase-js` remain in any API route
- [ ] All API routes use `createClient` from `@/utils/supabase/server`
- [ ] Analytics page loads data for the logged-in user
- [ ] Study session POST creates records in the database
- [ ] `pnpm build` succeeds with no type errors

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Cookie not forwarded in API route context | Low | Next.js App Router automatically forwards cookies to Route Handlers |
| Breaking change for any client-side callers using Bearer token | Medium | Audit all `fetch('/api/analytics')` and `fetch('/api/study')` calls to confirm they don't set custom auth headers |

**Rollback**: Revert the two file changes. No database or schema changes involved.

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~45 minutes
- **Dependencies**: None
