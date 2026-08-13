
-- Revoke then Grant to ensure a clean state
REVOKE ALL ON public.team_members FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

-- Ensure RLS is active
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Ensure the 'is_master' function is correctly checking roles
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid()
    AND (
      role::text ILIKE 'master' OR 
      role::text ILIKE 'admin' OR 
      cargo_principal ILIKE 'Diretor' OR 
      cargo_principal ILIKE 'Fundador' OR
      cargo_principal ILIKE 'master' OR
      cargo_principal ILIKE 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the update policy to use is_master()
DROP POLICY IF EXISTS "Admins can update all members" ON public.team_members;
CREATE POLICY "Admins can update all members" 
ON public.team_members 
FOR UPDATE 
TO authenticated 
USING (public.is_master())
WITH CHECK (public.is_master());

-- Allow users to update their own basic profile data (excluding roles)
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.team_members;
CREATE POLICY "Users can update own basic profile" 
ON public.team_members 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
