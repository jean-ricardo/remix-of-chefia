-- Allow authenticated users to insert a new team (to become a director)
GRANT INSERT, SELECT, UPDATE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;

-- Enable RLS just in case it wasn't
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Policy for Insertion
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for Selection
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
CREATE POLICY "Users can view their own teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  )
);

-- Policy for Update
DROP POLICY IF EXISTS "Directors can update their teams" ON public.teams;
CREATE POLICY "Directors can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'diretor'
  )
);
