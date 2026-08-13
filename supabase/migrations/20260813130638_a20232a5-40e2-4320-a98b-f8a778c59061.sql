-- Fix security linter warnings by setting search_path and revoking public execute where appropriate

-- 1. Fix is_master search_path and revoke public access
ALTER FUNCTION public.is_master() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated, service_role;

-- 2. Fix other previously identified functions (if they exist from previous steps)
-- has_role
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
        ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
    END IF;
END $$;

-- delete_user_account
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_user_account') THEN
        ALTER FUNCTION public.delete_user_account(uuid) SET search_path = public;
        REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;
    END IF;
END $$;
