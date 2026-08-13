
-- Fix linter warnings for public.is_master()
ALTER FUNCTION public.is_master() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated, service_role;
