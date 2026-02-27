# SOLO-95 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize a local Supabase project and define the SQL migration for our core active recall schema.

**Architecture:** We will use `npx supabase init` to bootstrap the local Supabase configuration, then generate a new migration file. We'll populate this migration file with the SQL schema approved in `docs/plans/2026-02-27-solo-95-design.md`, which includes tables for `users`, `artifacts`, `cards` (with FSRS fields), and `study_sessions`, along with Row Level Security (RLS) policies.

**Tech Stack:** Supabase CLI, PostgreSQL

---

### Task 1: Initialize Supabase

**Step 1: Initialize the Supabase project**

Run: `npx supabase init`
Expected: PASS (Creates `supabase/` directory with `config.toml`)

**Step 2: Commit initialization**

Run: 
```bash
git add supabase/
git commit -m "chore: initialize supabase project"
```

---

### Task 2: Define Core Schema Migration

**Step 1: Generate the migration file**

Run: `npx supabase migration new init_schema`
Expected: PASS (Creates a file like `supabase/migrations/20240227123456_init_schema.sql`)

**Step 2: Note the migration file name**

Run: `ls -1 supabase/migrations/*_init_schema.sql`
Expected: Outputs the exact file path to modify.

**Step 3: Write the schema SQL implementation**

Modify the generated SQL file (`supabase/migrations/*_init_schema.sql`) with the following exact SQL:

```sql
-- public.users (Profile table linked to auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- public.artifacts
CREATE TABLE public.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    outline JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- public.cards
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_context TEXT NOT NULL,
    judge_score FLOAT,
    judge_feedback TEXT,
    
    -- FSRS Fields
    fsrs_state SMALLINT NOT NULL DEFAULT 0, -- 0=New, 1=Learning, 2=Review, 3=Relearning
    fsrs_due TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fsrs_stability FLOAT NOT NULL DEFAULT 0,
    fsrs_difficulty FLOAT NOT NULL DEFAULT 0,
    fsrs_elapsed_days INT NOT NULL DEFAULT 0,
    fsrs_scheduled_days INT NOT NULL DEFAULT 0,
    fsrs_reps INT NOT NULL DEFAULT 0,
    fsrs_lapses INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- public.study_sessions
CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL, -- 1=Again, 2=Hard, 3=Good, 4=Easy
    duration_ms INT NOT NULL,
    state_before SMALLINT NOT NULL,
    state_after SMALLINT NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can fully manage their own artifacts"
    ON public.artifacts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can fully manage cards in their artifacts"
    ON public.cards FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.artifacts a WHERE a.id = artifact_id AND a.user_id = auth.uid()));

CREATE POLICY "Users can fully manage their own study sessions"
    ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Step 4: Verify Migration Syntax**

Run: `npx supabase start`
(Since `supabase start` uses Docker and might be slow or fail depending on Docker being running on the environment, we might just verify linting or ignore starting if docker is not running. Let's rely on standard sql parsing if `npx supabase start` fails, but the intention is testing syntax). Wait, let's just test with `npx supabase start` to see if migrations apply.

**Step 5: Commit changes**

Run: 
```bash
git add supabase/migrations/
git commit -m "feat: add initial schema migration"
```
