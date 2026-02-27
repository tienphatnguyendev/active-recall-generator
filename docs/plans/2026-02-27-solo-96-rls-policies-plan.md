# SOLO-96: Implement Granular RLS Policies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement explicit, granular Row Level Security (RLS) policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) for all tables in the Supabase schema to ensure users can only access and modify their own data.

**Architecture:** We will modify the existing `supabase/migrations/20260227152105_init_schema.sql` file to replace the initial `FOR ALL` policies with specific, granular policies for each operation, using subqueries for relationship checks where necessary (e.g., `cards`).

**Tech Stack:** PostgreSQL (Supabase)

---

### Task 1: Update `public.users` RLS Policies

**Files:**
- Modify: `supabase/migrations/20260227152105_init_schema.sql`

**Step 1: Replace existing user policy**

Remove:
```sql
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT USING (auth.uid() = id);
```

Add explicit SELECT policy (though identical, ensuring it's the only one):
```sql
-- public.users RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);
-- Note: INSERT/UPDATE/DELETE are managed via triggers, no policies needed.
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260227152105_init_schema.sql
git commit -m "feat(db): update public.users RLS policies"
```

---

### Task 2: Update `public.artifacts` RLS Policies

**Files:**
- Modify: `supabase/migrations/20260227152105_init_schema.sql`

**Step 1: Replace existing artifacts policy**

Remove:
```sql
CREATE POLICY "Users can fully manage their own artifacts"
    ON public.artifacts FOR ALL USING (auth.uid() = user_id);
```

Add granular policies:
```sql
-- public.artifacts RLS
DROP POLICY IF EXISTS "Users can fully manage their own artifacts" ON public.artifacts;

CREATE POLICY "Users can view their own artifacts"
    ON public.artifacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own artifacts"
    ON public.artifacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artifacts"
    ON public.artifacts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artifacts"
    ON public.artifacts FOR DELETE
    USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260227152105_init_schema.sql
git commit -m "feat(db): implement granular RLS policies for public.artifacts"
```

---

### Task 3: Update `public.cards` RLS Policies

**Files:**
- Modify: `supabase/migrations/20260227152105_init_schema.sql`

**Step 1: Replace existing cards policy**

Remove:
```sql
CREATE POLICY "Users can fully manage cards in their artifacts"
    ON public.cards FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.artifacts a WHERE a.id = artifact_id AND a.user_id = auth.uid()));
```

Add granular policies:
```sql
-- public.cards RLS
DROP POLICY IF EXISTS "Users can fully manage cards in their artifacts" ON public.cards;

CREATE POLICY "Users can view cards in their artifacts"
    ON public.cards FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.artifacts a 
        WHERE a.id = artifact_id AND a.user_id = auth.uid()
    ));

CREATE POLICY "Users can create cards in their artifacts"
    ON public.cards FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.artifacts a 
        WHERE a.id = artifact_id AND a.user_id = auth.uid()
    ));

CREATE POLICY "Users can update cards in their artifacts"
    ON public.cards FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.artifacts a 
        WHERE a.id = artifact_id AND a.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.artifacts a 
        WHERE a.id = artifact_id AND a.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete cards in their artifacts"
    ON public.cards FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.artifacts a 
        WHERE a.id = artifact_id AND a.user_id = auth.uid()
    ));
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260227152105_init_schema.sql
git commit -m "feat(db): implement granular RLS policies for public.cards"
```

---

### Task 4: Update `public.study_sessions` RLS Policies

**Files:**
- Modify: `supabase/migrations/20260227152105_init_schema.sql`

**Step 1: Replace existing study_sessions policy**

Remove:
```sql
CREATE POLICY "Users can fully manage their own study sessions"
    ON public.study_sessions FOR ALL USING (auth.uid() = user_id);
```

Add granular policies:
```sql
-- public.study_sessions RLS
DROP POLICY IF EXISTS "Users can fully manage their own study sessions" ON public.study_sessions;

CREATE POLICY "Users can view their own study sessions"
    ON public.study_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study sessions"
    ON public.study_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
    ON public.study_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
    ON public.study_sessions FOR DELETE
    USING (auth.uid() = user_id);
```

**Step 2: Verify Supabase Schema validity**
If `supabase` CLI is installed and running locally, verify the migration compiles correctly:
```bash
supabase db reset
```
*(If the CLI is not available, we rely on careful syntax checking)*

**Step 3: Commit**

```bash
git add supabase/migrations/20260227152105_init_schema.sql
git commit -m "feat(db): implement granular RLS policies for public.study_sessions"
```
