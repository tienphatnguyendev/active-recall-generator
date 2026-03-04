-- Migration: Drop old schema
DROP TABLE IF EXISTS public.study_sessions CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.artifacts CASCADE;

-- Enable ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create folders table
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path LTREE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_folders_path ON public.folders USING GIST (path);
CREATE INDEX idx_folders_user_id ON public.folders (user_id);

-- Create new artifacts table
CREATE TABLE public.artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    outline JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_artifacts_folder_id ON public.artifacts (folder_id);

-- Create cards table (unchanged structure)
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    fsrs_state SMALLINT DEFAULT 0 NOT NULL,
    due TIMESTAMPTZ DEFAULT now() NOT NULL,
    stability FLOAT8 DEFAULT 0 NOT NULL,
    difficulty FLOAT8 DEFAULT 0 NOT NULL,
    elapsed_days SMALLINT DEFAULT 0 NOT NULL,
    scheduled_days SMALLINT DEFAULT 0 NOT NULL,
    reps SMALLINT DEFAULT 0 NOT NULL,
    lapses SMALLINT DEFAULT 0 NOT NULL,
    state JSONB DEFAULT '{}'::jsonb NOT NULL,
    last_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_cards_artifact_id ON public.cards (artifact_id);

-- Create study_sessions table (unchanged structure)
CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cards_studied INT DEFAULT 0 NOT NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions (user_id);
