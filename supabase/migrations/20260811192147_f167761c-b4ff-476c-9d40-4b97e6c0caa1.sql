-- Fix: Revoke public execute from security definer functions using correct signatures
REVOKE ALL ON FUNCTION public.auth_team_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_director() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_empresa_e_diretor(text,text,uuid,text,text,text) FROM PUBLIC;

-- Grant execute to specific roles
GRANT EXECUTE ON FUNCTION public.auth_team_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.criar_empresa_e_diretor(text,text,uuid,text,text,text) TO authenticated, service_role;
