# Implementation Plan: I1 — Duplicate Supabase Server Client Modules

## Issue Summary

Two nearly identical files export a `createClient()` function for server-side Supabase access: `utils/supabase/server.ts` and `lib/supabase/server.ts`. Different parts of the codebase import from different paths, causing confusion and making future changes error-prone (a fix in one file may not be applied to the other).

## Technical Approach

Consolidate to a single module at `utils/supabase/server.ts` (the canonical Supabase Next.js pattern, alongside `client.ts` and `middleware.ts`). Update all imports that reference `lib/supabase/server.ts` to use the canonical path. Delete the duplicate.

## Implementation Steps

### Step 1: Find all imports of the duplicate (5 min)

```bash
grep -r "from.*lib/supabase/server" --include="*.ts" --include="*.tsx" app/ components/
```

Expected files:
- `app/actions/artifacts.ts`
- `app/actions/study.ts`
- `app/artifacts/page.tsx`
- `app/study/page.tsx`

### Step 2: Update all imports (10 min)

**Dependencies**: Step 1

```diff
-import { createClient } from "@/lib/supabase/server";
+import { createClient } from "@/utils/supabase/server";
```

### Step 3: Delete the duplicate (2 min)

```bash
rm lib/supabase/server.ts
rmdir lib/supabase  # if empty
```

### Step 4: Verify (5 min)

```bash
pnpm build  # Ensure no broken imports
```

## Acceptance Criteria

- [ ] Only one `createClient` server module exists: `utils/supabase/server.ts`
- [ ] All imports reference `@/utils/supabase/server`
- [ ] `pnpm build` succeeds
- [ ] `lib/supabase/` directory is removed

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Missed import | Low | `pnpm build` will catch immediately |

**Rollback**: Restore `lib/supabase/server.ts`.

## Resources Required

- **Team**: 1 developer
- **Time**: ~22 minutes
