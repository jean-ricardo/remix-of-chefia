CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Get the role of the user calling the function
  SELECT cargo_principal INTO caller_role
  FROM public.team_members
  WHERE id = auth.uid();

  -- Only allow 'diretor' or 'admin' to delete users
  IF caller_role IS NULL OR (lower(caller_role) != 'diretor' AND lower(caller_role) != 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores ou diretores podem excluir usuários.';
  END IF;

  -- Proceed with deletion from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;