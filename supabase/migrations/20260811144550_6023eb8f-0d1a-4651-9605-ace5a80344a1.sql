-- Revoke EXECUTE from PUBLIC and anon for sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.auth_team_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_team_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_team_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_team_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM anon;

-- Grant EXECUTE to authenticated and service_role for auth_team_id
-- This is necessary because RLS policies run as the user, and they need to execute this function
GRANT EXECUTE ON FUNCTION public.auth_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_team_id() TO service_role;

-- delete_team_member and delete_user_account are usually admin-only,
-- but they are often called via RPC which requires EXECUTE permissions.
-- We restrict their internal logic via RLS or owner checks, but the function itself
-- needs to be executable by the roles that call it.
GRANT EXECUTE ON FUNCTION public.delete_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;
