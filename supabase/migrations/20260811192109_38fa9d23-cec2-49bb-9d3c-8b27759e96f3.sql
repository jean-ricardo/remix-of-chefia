DROP POLICY IF EXISTS "Admins e Diretores podem atualizar qualquer membro" ON public.team_members;
DROP POLICY IF EXISTS "Admins e Diretores podem deletar membros" ON public.team_members;
DROP POLICY IF EXISTS "Allow members to see team" ON public.team_members;
DROP POLICY IF EXISTS "Allow authenticated to insert self" ON public.team_members;
DROP POLICY IF EXISTS "Allow public insert" ON public.team_members;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.team_members;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.team_members;
DROP POLICY IF EXISTS "Registration flow can insert new members" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_authenticated" ON public.team_members;
DROP POLICY IF EXISTS "Users can view members of their own team" ON public.team_members;
DROP POLICY IF EXISTS "Directors can update member status and role" ON public.team_members;

-- Function to check if the current user is a director
CREATE OR REPLACE FUNCTION public.is_director()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = auth.uid()
      AND role = 'diretor'
  );
$$;

-- SELECT: Allow users to see members of their own team
CREATE POLICY "team_members_select"
ON public.team_members
FOR SELECT
TO authenticated
USING (team_id = public.auth_team_id());

-- INSERT: Allow insertion during signup (public or authenticated)
CREATE POLICY "team_members_insert"
ON public.team_members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- UPDATE: Users can update their own profile, OR directors can update anyone in their team
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

-- DELETE: Only directors can delete members of their team
CREATE POLICY "team_members_delete"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  public.is_director() AND team_id = public.auth_team_id()
);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT INSERT ON public.team_members TO anon;
GRANT ALL ON public.team_members TO service_role;
