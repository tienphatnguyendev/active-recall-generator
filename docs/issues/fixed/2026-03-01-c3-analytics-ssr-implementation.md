# C3: Convert Analytics Page to Server Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the analytics page to a Server Component to solve the missing auth header issue and align with the project's architectural pattern.

**Architecture:** We are moving from client-side `fetch()` to server-side data fetching. The `AnalyticsPage` (Server Component) will fetch data via Supabase RPCs and pass it to a new `AnalyticsClient` (Client Component) for rendering.

**Tech Stack:** Next.js (App Router, Server Components), Supabase SSR, TypeScript.

---

### Task 1: Create AnalyticsClient Component

**Files:**
- Create: `app/analytics/analytics-client.tsx`

**Step 1: Extract client-side logic from page.tsx**
Create the new `AnalyticsClient` component and move all rendering logic and imports from `app/analytics/page.tsx`.

**Step 2: Commit**

```bash
git add app/analytics/analytics-client.tsx
git commit -m "feat: create AnalyticsClient component"
```

---

### Task 2: Convert Analytics Page to Server Component

**Files:**
- Modify: `app/analytics/page.tsx`

**Step 1: Rewrite page.tsx as an async Server Component**
Fetch data using `createClient()` from `@/utils/supabase/server` and the three RPCs. Transform the data into the format expected by `AnalyticsClient`.

**Step 2: Commit**

```bash
git add app/analytics/page.tsx
git commit -m "feat: convert analytics page to server component"
```

---

### Task 3: Cleanup and Verification

**Files:**
- Delete: `app/api/analytics/route.ts`

**Step 1: Delete the redundant API route**
The API route is no longer needed as data is fetched server-side.

**Step 2: Run build to verify**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add .
git commit -m "cleanup: remove redundant analytics API route and verify build"
```
