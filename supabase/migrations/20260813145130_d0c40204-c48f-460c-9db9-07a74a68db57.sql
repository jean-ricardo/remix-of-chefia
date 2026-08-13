
-- Resolve linter warnings for specific SECURITY DEFINER functions in public schema with their correct arguments

-- is_master()
ALTER FUNCTION public.is_master() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated, service_role;

-- delete_team_member(target_member_id uuid)
ALTER FUNCTION public.delete_team_member(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.delete_team_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_team_member(uuid) TO authenticated, service_role;

-- delete_user_account(target_user_id uuid)
ALTER FUNCTION public.delete_user_account(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;
