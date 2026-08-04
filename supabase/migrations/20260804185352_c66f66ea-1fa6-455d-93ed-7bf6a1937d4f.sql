ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
GRANT SELECT ON public.activities TO anon;