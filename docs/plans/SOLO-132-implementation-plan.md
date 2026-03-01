# Frontend Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all frontend security gaps: export route auth bypass (SOLO-108), server action Zod validation (SOLO-109), and middleware route closure fragility (SOLO-111).

**Architecture:** Three independent security fixes across the Next.js frontend. Each sub-issue is an isolated change with no cross-dependencies. Work progresses from most critical (auth bypass) to least (middleware refactor). All changes are frontend-only TypeScript edits.

**Tech Stack:** Next.js 15, Supabase SSR (`@supabase/ssr`), Zod (new dependency), TypeScript

**Linear Epic:** [SOLO-132](https://linear.app/aaron-solo/issue/SOLO-132)

---

## Sub-Issue 1: SOLO-108 — Export Routes Token Verification

**Priority:** 🔴 P0 (Urgent) — Auth bypass  
**Effort:** Low (~20 min)

### Problem

Both export routes (`app/api/artifacts/export/route.ts` and `app/api/artifacts/[id]/export/route.ts`) check for the *presence* of a Bearer token but never verify it with Supabase. Any non-empty string passes authentication. The per-artifact export doesn't verify ownership either.

### Current Code (Broken)

```typescript
// app/api/artifacts/export/route.ts — Line 15
const token = request.headers.get('authorization')?.split('Bearer ')[1];
if (!token) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// ❌ No supabase.auth.getUser() — token is never validated
```

### Task 1.1: Fix Bulk Export Route Auth

**Files:**
- Modify: `app/api/artifacts/export/route.ts`

**Step 1: Replace fake token check with real Supabase auth**

Replace the entire `GET` function body's auth section with proper SSR-client auth:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const allowed = ['json', 'csv', 'pdf', 'anki'];

    if (!allowed.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format "${format}". Allowed: ${allowed.join(', ')}.` },
        { status: 400 }
      );
    }

    // Fetch real artifacts for the authenticated user
    const { data: artifacts, error: fetchError } = await supabase
      .from('artifacts')
      .select('id, source_name, section_title, created_at, cards(id, question, answer, judge_score)')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching artifacts for export:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch artifacts' }, { status: 500 });
    }

    if (format === 'json') {
      const body = JSON.stringify({ artifacts: artifacts || [] }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="artifacts-export.json"',
        },
      });
    }

    if (format === 'csv') {
      let csv = 'artifact_id,source,section,question,answer,judge_score\n';
      for (const artifact of (artifacts || [])) {
        for (const card of (artifact.cards || [])) {
          // Escape fields containing commas or quotes
          const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
          csv += `${artifact.id},${escape(artifact.source_name)},${escape(artifact.section_title)},${escape(card.question)},${escape(card.answer)},${card.judge_score ?? ''}\n`;
        }
      }
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="artifacts-export.csv"',
        },
      });
    }

    // pdf / anki — return empty placeholder bytes (TODO: implement real export)
    return new NextResponse(new Uint8Array(), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="artifacts-export.${format === 'anki' ? 'apkg' : format}"`,
      },
    });
  } catch (error) {
    console.error('Artifacts bulk export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add app/api/artifacts/export/route.ts
git commit -m "fix(SOLO-108): verify auth token in bulk export route"
```

---

### Task 1.2: Fix Per-Artifact Export Route Auth + Ownership

**Files:**
- Modify: `app/api/artifacts/[id]/export/route.ts`

**Step 1: Replace fake token check with real auth + ownership verification**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const allowed = ['json', 'csv', 'pdf', 'anki'];

    if (!allowed.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format "${format}". Allowed: ${allowed.join(', ')}.` },
        { status: 400 }
      );
    }

    // Fetch artifact by ID — RLS ensures user can only access their own
    const { data: artifact, error: fetchError } = await supabase
      .from('artifacts')
      .select('id, source_name, section_title, created_at, cards(id, question, answer, judge_score)')
      .eq('id', id)
      .single();

    if (fetchError || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    if (format === 'json') {
      const body = JSON.stringify({ id: artifact.id, source: artifact.source_name, section: artifact.section_title, qaPairs: artifact.cards || [] }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="artifact-${id}.json"`,
        },
      });
    }

    if (format === 'csv') {
      let csv = 'question,answer,judge_score\n';
      for (const card of (artifact.cards || [])) {
        const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
        csv += `${escape(card.question)},${escape(card.answer)},${card.judge_score ?? ''}\n`;
      }
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="artifact-${id}.csv"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="artifact-${id}.${format === 'anki' ? 'apkg' : format}"`,
      },
    });
  } catch (error) {
    console.error('Artifact export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add app/api/artifacts/\[id\]/export/route.ts
git commit -m "fix(SOLO-108): verify auth + ownership in per-artifact export"
```

---

## Sub-Issue 2: SOLO-109 — Server-Side Input Validation with Zod

**Priority:** 🔴 P1 (Urgent) — Injection/abuse risk  
**Effort:** Medium (~30 min)

### Problem

The `login` and `register` server actions in `app/actions/auth.ts` perform zero validation before passing user input directly to Supabase. No email format check, no password enforcement, no null guards.

### Current Code (Broken)

```typescript
// app/actions/auth.ts — Lines 9-10
const email = formData.get("email") as string;    // ❌ Could be null
const password = formData.get("password") as string; // ❌ No length check
```

### Task 2.1: Install Zod

**Step 1: Add Zod dependency**

Run: `npm install zod`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(SOLO-109): add zod for server-side validation"
```

---

### Task 2.2: Create Validation Schemas

**Files:**
- Create: `lib/validations/auth.ts`

**Step 1: Write the Zod schemas**

```typescript
// lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
  name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

**Step 2: Commit**

```bash
git add lib/validations/auth.ts
git commit -m "feat(SOLO-109): add Zod schemas for login and register"
```

---

### Task 2.3: Wire Validation into Server Actions

**Files:**
- Modify: `app/actions/auth.ts`

**Step 1: Update `login` and `register` with Zod validation**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export async function login(formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/artifacts");
}

export async function register(formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  };

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/artifacts");
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
```

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add app/actions/auth.ts
git commit -m "fix(SOLO-109): add Zod validation to login/register server actions"
```

---

## Sub-Issue 3: SOLO-111 — Middleware Route Closure

**Priority:** 🟠 P2 (High) — Forgot-password redirect bug  
**Effort:** Low (~10 min)

### Problem

`utils/supabase/middleware.ts` defines two separate, manually-maintained lists for the same concept (public/auth routes). The redirect-to-login check does **not** include `/forgot-password` or `/reset-password`, so unauthenticated users visiting those pages get incorrectly redirected to `/login`.

### Current Code (Broken)

```typescript
// Lines 41-53 of utils/supabase/middleware.ts

// List 1: isAuthRoute (includes forgot/reset)
const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/register') ||
                    request.nextUrl.pathname.startsWith('/forgot-password') ||
                    request.nextUrl.pathname.startsWith('/reset-password');

// List 2: redirect check (MISSING forgot/reset) ❌
if (
  !user &&
  !request.nextUrl.pathname.startsWith('/login') &&
  !request.nextUrl.pathname.startsWith('/register') &&
  request.nextUrl.pathname !== '/'
) {
```

### Task 3.1: Refactor to Single `publicRoutes` Array

**Files:**
- Modify: `utils/supabase/middleware.ts`

**Step 1: Replace the two separate checks with a unified array**

Replace lines 38–63 (after `supabase.auth.getUser()`) with:

```typescript
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Single source of truth for routes accessible without authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = request.nextUrl.pathname === '/' ||
    publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // Redirect unauthenticated users to login (unless on a public route)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages (but not '/')
  const isAuthRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/artifacts'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
```

**Step 2: Verify build compiles**

Run: `npx next build`
Expected: No type errors.

**Step 3: Commit**

```bash
git add utils/supabase/middleware.ts
git commit -m "fix(SOLO-111): unify middleware public routes into single array"
```

---

## Verification Plan

### Automated Tests

No automated frontend tests exist in this project currently (the `tests/` directory contains only Python backend tests). The project does not have Jest, Vitest, or React Testing Library configured.

**Build verification:**
```bash
npx next build
```
This will catch all TypeScript errors, import issues, and compilation problems.

### Manual Verification

> [!IMPORTANT]
> Since there is no frontend test framework configured, all verification must be done manually via the browser after starting the dev server with `npm run dev`.

#### SOLO-108: Export Auth Verification
1. Start the dev server: `npm run dev`
2. **Without logging in**, open browser DevTools → Console and run:
   ```javascript
   fetch('/api/artifacts/export?format=json', { headers: { Authorization: 'Bearer fake-token' } }).then(r => r.json()).then(console.log)
   ```
3. ✅ Should return `{ error: 'Unauthorized' }` with status 401 (not 200)
4. **Log in** with a valid account, then test the export button in the UI
5. ✅ Should download real artifact data

#### SOLO-109: Input Validation
1. Navigate to `/register`
2. Submit the form with:
   - Empty email → ✅ Should show "Email is required"
   - Invalid email (e.g., `not-an-email`) → ✅ Should show "Please enter a valid email address"  
   - Password < 8 chars → ✅ Should show "Password must be at least 8 characters"
   - Empty name → ✅ Should show "Name is required"
3. Navigate to `/login`
4. Submit with empty fields → ✅ Should show validation errors (not a Supabase error)

#### SOLO-111: Middleware Route Verification
1. **Without logging in**, navigate to `/forgot-password`
2. ✅ Page should load (not redirect to `/login`)
3. Navigate to `/reset-password`
4. ✅ Page should load (not redirect to `/login`)
5. **Log in**, then navigate to `/forgot-password`
6. ✅ Should redirect to `/artifacts`

---

## Estimated Time

| Sub-Issue | Task | Estimated Time |
|-----------|------|---------------|
| SOLO-108 | Bulk export route auth | 10 min |
| SOLO-108 | Per-artifact export auth | 10 min |
| SOLO-109 | Install Zod | 2 min |
| SOLO-109 | Create validation schemas | 5 min |
| SOLO-109 | Wire into server actions | 10 min |
| SOLO-111 | Refactor middleware routes | 10 min |
| — | Build verification + manual testing | 15 min |
| **Total** | | **~60 min** |
