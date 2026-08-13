-- Fix for administrative functions and permissions
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void AS $$
BEGIN
    DELETE FROM public.team_members WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.delete_user_account(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid()
    AND (
      role::text ILIKE 'master' OR 
      role::text ILIKE 'admin' OR 
      role::text ILIKE 'adm' OR
      role::text ILIKE 'diretor' OR
      role::text ILIKE 'director' OR
      role::text ILIKE 'fundador' OR
      cargo_principal ILIKE 'Diretor' OR 
      cargo_principal ILIKE 'Director' OR 
      cargo_principal ILIKE 'Fundador' OR
      cargo_principal ILIKE 'master' OR
      cargo_principal ILIKE 'admin' OR
      cargo_principal ILIKE 'adm'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;