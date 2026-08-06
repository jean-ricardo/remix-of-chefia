-- Allow authenticated users to insert a new team (to become a director)
-- On Lovable Cloud, we grant to authenticated and service_role.
-- RLS policy for insertion: any authenticated user can create a team.

GRANT INSERT ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;

DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure they can see the team they just created or are part of
GRANT SELECT ON public.teams TO authenticated;
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

-- And directors can update their team
GRANT UPDATE ON public.teams TO authenticated;
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
