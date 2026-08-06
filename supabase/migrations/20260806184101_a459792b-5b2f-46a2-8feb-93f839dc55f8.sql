ALTER TABLE public.completions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT now() NOT NULL;
GRANT ALL ON public.completions TO authenticated;
GRANT ALL ON public.completions TO service_role;
