# Migrate Artifact CRUD to Supabase Client Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the Next.js web application away from mock API endpoints (`/api/artifacts/*`) to direct interactions with the Supabase database using React Server Components and Server Actions.

**Architecture:** We will install `@supabase/ssr` and `@supabase/supabase-js`, set up the standard client/server utilities, and refactor `app/artifacts/page.tsx` and `app/study/page.tsx` into Server Components that fetch directly from Supabase. We will replace mutations with Server Actions and delete the old API routes.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase SSR.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Supabase packages**

Run: `npm install @supabase/supabase-js @supabase/ssr`
(or use `uv run npm install ...` depending on the exact node package manager configuration, though `package-lock.json` and `pnpm-lock.yaml` both exist. I recommend using the standard package manager which seems to be `npm` or `pnpm`. Let's assume `npm` given `package-lock.json` is latest).

**Step 2: Commit**

```bash
git add package.json package-lock.json pnpm-lock.yaml
git commit -m "chore: add @supabase/supabase-js and @supabase/ssr dependencies"
```

### Task 2: Setup Supabase Server Utilities

**Files:**
- Create: `lib/supabase/server.ts`

**Step 1: Write utility implementation**

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
```

**Step 2: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat: add supabase server client utility"
```

### Task 3: Refactor Artifacts Page Server Component

**Files:**
- Modify: `app/artifacts/page.tsx`

**Step 1: Convert to Server Component and Fetch**

1.  Remove `"use client"`.
2.  Remove `useState`, `useEffect`, and the Mock data.
3.  Change `ArtifactsPage` to be an `async function`.
4.  Use `const supabase = await createClient();`
5.  Fetch artifacts: `const { data: artifacts, error } = await supabase.from('artifacts').select('*, qaPairs:cards(*)').order('created_at', { ascending: false });`
6.  Since the page has interactive elements (sidebar selection, expanding pairs, search), we must split it:
    *   Make `app/artifacts/page.tsx` the Server Component (`ArtifactsServerPage`).
    *   Create `app/artifacts/artifacts-client.tsx` (Client Component) that receives `artifacts` as a prop and holds the interactive UI.

*Note: You may need to adapt `MOCK_ARTIFACTS` type structure to match what Supabase actually returns (e.g. `cards` instead of `qaPairs`, `created_at` instead of `createdAt`).*

**Step 2: Test rendering manually or via typechecking**

Run: `npm run lint` or `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/artifacts/page.tsx app/artifacts/artifacts-client.tsx
git commit -m "refactor: convert artifacts page to server component with supabase fetch"
```

### Task 4: Refactor Study Page Server Component

**Files:**
- Modify: `app/study/page.tsx`

**Step 1: Convert to Server Component and Fetch**

1.  Similar to Artifacts, `app/study/page.tsx` becomes an asynchronous Server Component.
2.  Fetch cards: `const { data: cards, error } = await supabase.from('cards').select('*, artifacts(source)');`
3.  Extract the interactive session (flipping, rating) into a nested Client Component `StudySessionClient` passing the cards as props.
4.  Remove `ALL_PAIRS` stub data.

**Step 2: Typecheck**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add app/study/page.tsx app/study/study-client.tsx
git commit -m "refactor: fetch study cards directly from supabase via server component"
```

### Task 5: Implement Server Actions

**Files:**
- Create: `app/actions/artifacts.ts`
- Modify: `components/artifacts/export-button.tsx` (or any UI that deletes/mutates artifacts)

**Step 1: Create delete action**

```typescript
// app/actions/artifacts.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteArtifact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("artifacts").delete().eq("id", id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  revalidatePath("/artifacts");
}
```

**Step 2: Commit**

```bash
git add app/actions/artifacts.ts
git commit -m "feat: add deleteArtifact server action"
```

### Task 6: Cleanup Deprecated API Routes

**Files:**
- Delete: `app/api/artifacts/route.ts`
- Delete: `app/api/artifacts/[id]/route.ts`
- *Note:* Do NOT delete `export/route.ts` if it has specific non-CRUD logic unless also targeted for refactoring.

**Step 1: Remove files**

Remove the stubbed CRUD route handlers.

**Step 2: Commit**

```bash
git rm app/api/artifacts/route.ts app/api/artifacts/[id]/route.ts
git commit -m "refactor: remove deprecated mock api routes for artifacts"
```

---
