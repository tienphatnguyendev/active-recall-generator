# Design Document: C1 — Use SSR-aware Supabase client in API routes

## Problem Statement
The API routes at `app/api/analytics/route.ts` and `app/api/study/route.ts` create Supabase clients using the vanilla JS SDK with manual Bearer token injection. This bypasses the standard `@supabase/ssr` cookie-based authentication used elsewhere in the application, creating a fragile and inconsistent authentication chain.

## Proposed Design

### 1. Unified Client Access
Replace all manual `createClient` calls from `@supabase/supabase-js` with the SSR-aware server client from `@/utils/supabase/server`. This ensures that authentication is handled consistently via cookies, which are automatically forwarded by the browser.

### 2. Simplified Route Handlers
Remove manual `authorization` header extraction and manual Supabase client initialization. The `createClient()` helper already handles reading the necessary environment variables and cookies.

### 3. Maintain Auth Verification
Continue to use `supabase.auth.getUser()` to verify the user's session and retrieve the `userId`, ensuring the trust chain remains secure.

## Trade-offs
- **Pros**:
    - Consistency with the rest of the Next.js application.
    - Automatic session refreshing via middleware (since it uses cookies).
    - Reduced boilerplate in API routes.
- **Cons**:
    - Non-browser clients (if any) that rely purely on Bearer tokens would need to use cookies instead (not an issue for this project's current scope).

## Alternative Approaches
1. **Keep manual token but verify it properly**: This would solve the "bypass" but not the "inconsistency" or "fragility".
2. **Move logic to Server Actions**: This is preferred for many cases (like C3 plans to do for analytics) but fixing the API routes first provides immediate security and stability.

## Testing Strategy
- **Manual Verification**:
    - Log in to the application.
    - Verify that `/analytics` data loads correctly (via the existing client component).
    - Verify that `/study` page (if it uses the API) or any other API consumer continues to function.
- **Network Audit**:
    - Confirm no 401 Unauthorized errors in the browser console.
