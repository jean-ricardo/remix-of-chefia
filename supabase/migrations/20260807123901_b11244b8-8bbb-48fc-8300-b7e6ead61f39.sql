ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url TEXT;

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

GRANT SELECT, UPDATE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
