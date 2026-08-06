CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
    calling_user_id uuid := auth.uid();
    calling_user_role text;
begin
    -- 1. Buscar o cargo de quem está chamando a função na tabela team_members
    select lower(coalesce(cargo_principal, role, ''))
    into calling_user_role
    from public.team_members
    where id = calling_user_id;

    -- 2. Validação de segurança: apenas 'diretor' ou 'admin' podem prosseguir
    if calling_user_role not in ('diretor', 'admin', 'adm') then
        raise exception 'Acesso negado: apenas administradores ou diretores podem excluir usuários. (Detectado: %)', calling_user_role;
    end if;

    -- 3. Limpeza de dados profunda
    
    -- Deleta registros de logs de atividade onde o usuário alvo é mencionado no texto (auditoria)
    delete from public.activity_logs where details ilike '%' || target_user_id || '%';

    -- Deleta atividades atribuídas ao usuário (Isso dispara DELETE CASCADE em completions via FK se houver)
    -- Se houver tabelas que NÃO possuem ON DELETE CASCADE e apontam para activities ou team_members, 
    -- precisamos limpá-las aqui. No momento completions.activity_id tem CASCADE.
    delete from public.activities where assigned_user_id = target_user_id;

    -- 4. Exclusão do perfil na team_members
    delete from public.team_members where id = target_user_id;

    -- 5. Exclusão definitiva da conta no Supabase Auth
    delete from auth.users where id = target_user_id;
end;
$function$;
