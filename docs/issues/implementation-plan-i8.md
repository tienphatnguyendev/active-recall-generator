# Implementation Plan: I8 — Middleware Auth Route Gap

## Issue Summary

The middleware at `utils/supabase/middleware.ts` defines two separate, manually-maintained lists for auth/public routes. The `isAuthRoute` variable includes `/forgot-password` and `/reset-password`, but the redirect-to-login check omits them. This causes unauthenticated users hitting `/forgot-password` to be incorrectly redirected to `/login`.

## Technical Approach

Consolidate both checks into a single `publicRoutes` array to eliminate divergence.

## Implementation Steps

### Step 1: Refactor middleware (10 min)

**Dependencies**: None

Update `utils/supabase/middleware.ts`:

```typescript
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const authOnlyRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

const isPublicRoute = publicRoutes.some(r =>
  request.nextUrl.pathname === r || request.nextUrl.pathname.startsWith(r + '/')
);
const isAuthRoute = authOnlyRoutes.some(r =>
  request.nextUrl.pathname === r || request.nextUrl.pathname.startsWith(r + '/')
);

// Redirect unauthenticated users away from protected routes
if (!user && !isPublicRoute) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

// Redirect authenticated users away from auth pages
if (user && isAuthRoute) {
  const url = request.nextUrl.clone();
  url.pathname = '/artifacts';
  return NextResponse.redirect(url);
}
```

### Step 2: Test (10 min)

1. Unauthenticated: `/forgot-password` → should load (not redirect)
2. Unauthenticated: `/artifacts` → should redirect to `/login`
3. Authenticated: `/login` → should redirect to `/artifacts`
4. Authenticated: `/analytics` → should load

## Acceptance Criteria

- [ ] Single `publicRoutes` array defines all unauthenticated-accessible routes
- [ ] `/forgot-password` and `/reset-password` accessible without auth
- [ ] Protected routes still redirect to `/login`
- [ ] Auth pages still redirect authenticated users to `/artifacts`

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| API routes affected by middleware | Low | Middleware matcher already excludes `_next/static` etc. |

**Rollback**: Revert to dual-list pattern.

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~20 minutes
