-- Ensure RLS is active
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Final list of policies for team_members to ensure no recursion
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

-- SELECT: Use auth_team_id() which is SECURITY DEFINER (no recursion)
CREATE POLICY "team_members_select"
ON public.team_members
FOR SELECT
TO authenticated
USING (team_id = public.auth_team_id());

-- INSERT: Allow all authenticated/anon to insert (sign-up flow)
CREATE POLICY "team_members_insert"
ON public.team_members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- UPDATE: Profile owners or Directors (via is_director() SECURITY DEFINER)
CREATE POLICY "team_members_update"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR public.is_director()
)
WITH CHECK (
  user_id = auth.uid() OR (public.is_director() AND team_id = public.auth_team_id())
);

-- DELETE: Directors only
CREATE POLICY "team_members_delete"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  public.is_director() AND team_id = public.auth_team_id()
);
