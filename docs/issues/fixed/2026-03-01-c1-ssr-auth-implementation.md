# C1: Use SSR-aware Supabase client in API routes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual `@supabase/supabase-js` client creation in API routes with the standard SSR-aware client to ensure robust, cookie-based authentication.

**Architecture:** We are moving from manual Bearer token extraction to an SSR (Server Side Rendering) approach using `@supabase/ssr`. This automatically handles cookies and session management within the Next.js App Router context.

**Tech Stack:** Next.js (App Router), Supabase SSR, TypeScript.

---

### Task 1: Update Analytics API Route

**Files:**
- Modify: `app/api/analytics/route.ts`

**Step 1: Replace imports and client initialization**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userData.user.id;

    const [streakRes, weeklyRes, masteryRes] = await Promise.all([
      supabase.rpc('get_user_streak', { p_user_id: userId }),
      supabase.rpc('get_weekly_activity', { p_user_id: userId }),
      supabase.rpc('get_mastery_distribution', { p_user_id: userId })
    ]);
    
    // ... rest of the existing transformation logic
```

**Step 2: Commit**

```bash
git add app/api/analytics/route.ts
git commit -m "feat: use SSR-aware Supabase client in analytics API route"
```

---

### Task 2: Update Study API Route

**Files:**
- Modify: `app/api/study/route.ts`

**Step 1: Replace imports and client initialization in GET handler**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // ... rest of the existing query logic
```

**Step 2: Replace imports and client initialization in POST handler**

```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // ... rest of the existing insertion logic
```

**Step 3: Commit**

```bash
git add app/api/study/route.ts
git commit -m "feat: use SSR-aware Supabase client in study API route"
```

---

### Task 3: Verification

**Files:**
- None

**Step 1: Run build to verify type safety**

Run: `pnpm build`
Expected: PASS

**Step 2: Manual Verification (Instructions)**
1. Start dev server: `pnpm dev`
2. Log in via `/login`
3. Navigate to `/analytics` — verify data loads correctly.
4. Go to `/study` and complete a session — verify it's logged in the database.
5. Check browser Network tab for any 401 errors on `/api/analytics` or `/api/study`.

**Step 3: Commit Final Verification**

```bash
git commit --allow-empty -m "docs: confirm verification steps complete for C1"
```
