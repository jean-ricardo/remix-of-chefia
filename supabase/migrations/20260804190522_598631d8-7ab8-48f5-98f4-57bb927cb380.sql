ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Re-grant access since new columns are added
GRANT ALL ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
GRANT INSERT ON public.activities TO anon;
