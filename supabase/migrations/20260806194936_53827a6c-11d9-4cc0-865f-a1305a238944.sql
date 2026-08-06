
-- Revoke execution from public/authenticated if they were granted by default or mistake
-- We keep service_role to allow the system to function
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_user_account') THEN
    REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
  END IF;
END $$;
