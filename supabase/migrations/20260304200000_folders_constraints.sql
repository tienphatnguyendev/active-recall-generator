
-- Auto-update updated_at on folders and artifacts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'folders_updated_at') THEN
    CREATE TRIGGER folders_updated_at
      BEFORE UPDATE ON public.folders
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'artifacts_updated_at') THEN
    CREATE TRIGGER artifacts_updated_at
      BEFORE UPDATE ON public.artifacts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Prevent duplicate paths per user
ALTER TABLE public.folders
  ADD CONSTRAINT uq_folders_user_path UNIQUE (user_id, path);
