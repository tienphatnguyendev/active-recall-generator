# Implementation Plan: M4 — API Client Module Uses Module-Level Mutable State

## Issue Summary

`lib/api-client.ts` stores `_accessToken` and `_refreshFn` as module-level mutable variables. In a server-side rendering context, module state is shared across all concurrent requests, which could leak one user's token to another.

## Technical Approach

Ensure the `ApiClient` is only ever used in `'use client'` components. Add a runtime guard and a code comment to prevent server-side usage.

## Implementation Steps

### Step 1: Add client-only guard (5 min)

```typescript
// At the top of lib/api-client.ts
if (typeof window === 'undefined') {
  throw new Error('ApiClient must only be used in client components');
}
```

### Step 2: Verify no server-side imports (5 min)

```bash
grep -r "api-client" --include="*.ts" --include="*.tsx" app/ --files-with-matches
# Ensure none are server components
```

### Step 3: Alternative — refactor to instance-based (15 min, optional)

If server-side usage is needed in the future, convert to a class-based approach where the token is per-instance:

```typescript
export function createApiClient(token: string) {
  return {
    async get(path: string) { /* ... */ },
    async post(path: string, body: any) { /* ... */ },
  };
}
```

## Acceptance Criteria

- [ ] Module cannot be imported server-side without error
- [ ] No server components import `api-client.ts`

## Risk Assessment

Minimal — guards only affect existing misuse patterns.

## Resources Required

- **Team**: 1 developer
- **Time**: ~10–25 minutes
