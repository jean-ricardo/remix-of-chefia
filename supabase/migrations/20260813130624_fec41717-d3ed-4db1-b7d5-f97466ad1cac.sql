-- 1. Ensure proper grants for team_members
GRANT SELECT, INSERT, UPDATE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

-- 2. Refine is_master to be more resilient
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid()
    AND (role = 'master' OR role = 'admin' OR cargo_principal = 'Diretor' OR cargo_principal = 'Fundador')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Policy for self-insertion (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_members' AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.team_members 
        FOR INSERT TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
