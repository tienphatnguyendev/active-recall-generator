# Design Document: Next.js Supabase Auth Integration (SOLO-97)

## Overview
Implement real authentication in the Next.js frontend by replacing the mock `AuthContext` and route handlers with `@supabase/ssr` and `@supabase/supabase-js`. We will use a Server-Component Driven approach, utilizing Server Actions and Middleware for optimal security and seamless hydration.

## Architecture & Data Flow

### 1. Utility Layer (`utils/supabase/`)
We will create three distinct Supabase clients to handle different execution contexts securely:
*   `client.ts`: `createBrowserClient` for Client Components.
*   `server.ts`: `createServerClient` for Server Components and Server Actions.
*   `middleware.ts`: `createServerClient` adapted for Next.js Middleware to ensure cookies are read and optionally refreshed before a request is resolved.

### 2. Route Protection (`middleware.ts`)
A root-level middleware will intercept requests:
- If a user lacks a valid session and accesses protected routes (`/artifacts`, `/study`, `/analytics`), they are redirected to `/login`.
- If a user has a valid session and accesses auth routes (`/login`, `/register`), they are redirected to `/artifacts`.
- The middleware also ensures the Supabase session cookie remains fresh.

### 3. Server Actions (`app/actions/auth.ts`)
We will replace the mock API endpoints in `app/api/auth/*` with Next.js Server Actions:
- `login(formData)`
- `register(formData)`
- `logout()`

These actions run securely on the server, interact with Supabase Auth, set secure HTTP-only cookies, and issue redirects (e.g., redirecting to `/artifacts` upon successful login).

### 4. Auth Context Refactoring (`components/auth/auth-context.tsx`)
The current heavy context will be stripped down.
- **Before:** Managed state, handled API calls (`login`, `logout`), and maintained its own `useEffect` bootstrap.
- **After:** A simple React Context that merely holds the `User | null` object passed down from the server layout.

### 5. Layout Integration (`app/layout.tsx`)
The root Server Layout will securely fetch the user session:
```tsx
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
```
It will then pass this `user` prop into the `<AuthProvider user={user}>`.

## Execution Steps
1. Install `@supabase/supabase-js` and `@supabase/ssr`.
2. Create `utils/supabase/` configuration files.
3. Implement `middleware.ts`.
4. Create `app/actions/auth.ts` Server Actions.
5. Refactor `AuthContext` and `RootLayout` to use server-side session.
6. Update `login/page.tsx`, `register/page.tsx`, and `logout-button.tsx` to use Server Actions instead of the old context methods.
7. Delete mock `app/api/auth/*` routes.
