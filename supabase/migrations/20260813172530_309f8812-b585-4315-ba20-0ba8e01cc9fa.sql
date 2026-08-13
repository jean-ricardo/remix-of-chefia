-- Refine administrative functions and policies
-- Drop the function first to avoid parameter name change error
DROP FUNCTION IF EXISTS public.delete_user_account(uuid);

-- Ensure is_master covers all administrative variations robustly
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean AS $$
DECLARE
  caller_role text;
  caller_cargo text;
BEGIN
  SELECT role::text, cargo_principal::text INTO caller_role, caller_cargo
  FROM public.team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN (
    COALESCE(caller_role, '') ILIKE 'master' OR 
    COALESCE(caller_role, '') ILIKE 'admin' OR 
    COALESCE(caller_role, '') ILIKE 'adm' OR
    COALESCE(caller_role, '') ILIKE 'diretor' OR
    COALESCE(caller_role, '') ILIKE 'director' OR
    COALESCE(caller_role, '') ILIKE 'fundador' OR
    COALESCE(caller_cargo, '') ILIKE 'Diretor' OR 
    COALESCE(caller_cargo, '') ILIKE 'Director' OR 
    COALESCE(caller_cargo, '') ILIKE 'Fundador' OR
    COALESCE(caller_cargo, '') ILIKE 'master' OR
    COALESCE(caller_cargo, '') ILIKE 'admin' OR
    COALESCE(caller_cargo, '') ILIKE 'adm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated, service_role;

-- delete_user_account RPC
CREATE OR REPLACE FUNCTION public.delete_user_account(target_member_id uuid)
RETURNS void AS $$
BEGIN
    -- Perform deletion from team_members
    DELETE FROM public.team_members WHERE id = target_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;

-- Update RLS policies for team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (public.is_master());

DROP POLICY IF EXISTS "Users can view their own profile" ON public.team_members;
CREATE POLICY "Users can view their own profile"
ON public.team_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure authenticated role has necessary permissions
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
