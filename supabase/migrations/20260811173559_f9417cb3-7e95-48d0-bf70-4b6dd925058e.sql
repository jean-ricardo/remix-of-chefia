CREATE OR REPLACE FUNCTION public.criar_empresa_e_diretor(
    empresa_nome text,
    convite_codigo text,
    usuario_id uuid,
    usuario_nome text,
    usuario_email text,
    usuario_telefone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    nova_team_id uuid;
BEGIN
    -- 1. Criar a empresa
    INSERT INTO public.teams (name, invite_code)
    VALUES (empresa_nome, convite_codigo)
    RETURNING id INTO nova_team_id;

    -- 2. Vincular o usuário como diretor aprovado
    INSERT INTO public.team_members (
        team_id,
        user_id,
        name,
        email,
        telefone,
        role,
        status,
        cargo_principal
    ) VALUES (
        nova_team_id,
        usuario_id,
        usuario_nome,
        usuario_email,
        usuario_telefone,
        'diretor',
        'aprovado',
        'Fundador'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_empresa_e_diretor TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_empresa_e_diretor TO service_role;