ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- folders RLS
CREATE POLICY "Users can manage their own folders" ON public.folders
FOR ALL USING (auth.uid() = user_id);

-- artifacts RLS
CREATE POLICY "Users can manage artifacts in their folders" ON public.artifacts
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.folders f
        WHERE f.id = folder_id AND f.user_id = auth.uid()
    )
);

-- cards RLS
CREATE POLICY "Users can manage cards in their folders" ON public.cards
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.artifacts a
        JOIN public.folders f ON f.id = a.folder_id
        WHERE a.id = artifact_id AND f.user_id = auth.uid()
    )
);

-- study_sessions RLS
CREATE POLICY "Users can manage their study sessions" ON public.study_sessions
FOR ALL USING (auth.uid() = user_id);
