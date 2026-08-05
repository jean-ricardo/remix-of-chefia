CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 1. Security Check: Only 'diretor' or 'admin' can delete users
  SELECT cargo_principal INTO caller_role
  FROM public.team_members
  WHERE id = auth.uid();

  IF caller_role IS NULL OR (lower(caller_role) != 'diretor' AND lower(caller_role) != 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ou diretores podem excluir usuários.';
  END IF;

  -- 2. Delete from public schema first (since there are no DB-level foreign keys to auth.users)
  -- This ensures data integrity within the public schema application logic
  DELETE FROM public.activities WHERE assigned_user_id = target_user_id;
  DELETE FROM public.team_members WHERE id = target_user_id;

  -- 3. Delete from auth.users (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;