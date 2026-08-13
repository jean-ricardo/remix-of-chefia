-- Resolve security linter warnings
ALTER FUNCTION public.is_master() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated, service_role;

ALTER FUNCTION public.delete_user_account(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;