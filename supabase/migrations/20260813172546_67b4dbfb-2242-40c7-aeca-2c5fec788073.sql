-- Address linter warnings for SECURITY DEFINER functions
-- These functions are meant to be called by authenticated users, but we should be explicit.

-- is_master() is already restricted to authenticated/service_role
-- But let's be extra sure and revoke PUBLIC execute.
REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated, service_role;

-- delete_user_account(uuid)
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;

-- delete_team_member(uuid) - if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_team_member') THEN
        REVOKE EXECUTE ON FUNCTION public.delete_team_member(uuid) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.delete_team_member(uuid) TO authenticated, service_role;
        ALTER FUNCTION public.delete_team_member(uuid) SET search_path = public;
    END IF;
END $$;
