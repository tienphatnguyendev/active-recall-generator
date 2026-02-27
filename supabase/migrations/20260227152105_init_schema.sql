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
-- public.users RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);
-- Note: INSERT/UPDATE/DELETE are managed via triggers, no policies needed.

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
