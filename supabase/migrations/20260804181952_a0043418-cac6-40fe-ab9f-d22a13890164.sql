ALTER TABLE public.activities ADD COLUMN status text DEFAULT 'todo';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;