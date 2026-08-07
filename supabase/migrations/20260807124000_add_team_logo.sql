ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- We don't have app_role enum yet probably, let's check existing roles logic.
-- The app uses team_members table with 'cargo_principal'.
-- So we should use a policy based on team_members.
-- Policy: Only members of the team can see it
DROP POLICY IF EXISTS "Team members can see their team" ON public.teams;
CREATE POLICY "Team members can see their team" ON public.teams
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

-- Policy: Only directors/admins of the team can update it
DROP POLICY IF EXISTS "Directors can update team" ON public.teams;
CREATE POLICY "Directors can update team" ON public.teams
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND (team_members.cargo_principal ILIKE 'diretor' OR team_members.cargo_principal ILIKE 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
            AND (team_members.cargo_principal ILIKE 'diretor' OR team_members.cargo_principal ILIKE 'admin')
        )
    );
