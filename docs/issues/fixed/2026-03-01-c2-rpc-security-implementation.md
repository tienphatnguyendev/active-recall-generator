# C2: Fix RPC security by removing p_user_id and using auth.uid() Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Secure the analytics RPC functions by removing the user ID parameter and using Supabase's built-in `auth.uid()` function.

**Architecture:** We are moving from `SECURITY DEFINER` with an untrusted parameter to `SECURITY INVOKER` (or hardened `SECURITY DEFINER`) that uses `auth.uid()` to ensure users can only access their own data.

**Tech Stack:** Supabase (PostgreSQL, PL/pgSQL), Next.js (TypeScript).

---

### Task 1: Create Migration File

**Files:**
- Create: `supabase/migrations/20260301000000_fix_rpc_security.sql`

**Step 1: Write the migration content**
Use the SQL provided in `docs/issues/implementation-plan-c2.md` to redefine `get_user_streak`, `get_weekly_activity`, and `get_mastery_distribution`.

**Step 2: Commit**

```bash
git add supabase/migrations/20260301000000_fix_rpc_security.sql
git commit -m "feat: fix RPC security by using auth.uid()"
```

---

### Task 2: Update API route callers

**Files:**
- Modify: `app/api/analytics/route.ts`

**Step 1: Remove p_user_id from RPC calls**

```typescript
// ...
    const [streakRes, weeklyRes, masteryRes] = await Promise.all([
      supabase.rpc('get_user_streak'),
      supabase.rpc('get_weekly_activity'),
      supabase.rpc('get_mastery_distribution')
    ]);
// ...
```

**Step 2: Commit**

```bash
git add app/api/analytics/route.ts
git commit -m "feat: remove p_user_id parameter from analytics RPC calls"
```

---

### Task 3: Verification

**Files:**
- None

**Step 1: Run build to verify type safety**

Run: `npm run build`
Expected: PASS

**Step 2: Database Reset (Manual)**
Run: `supabase db reset` (if local Supabase is running)

**Step 3: Commit Final Verification**

```bash
git commit --allow-empty -m "docs: confirm verification steps complete for C2"
```
