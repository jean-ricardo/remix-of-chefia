-- Adicionando limpeza profunda e garantindo exclusão do Auth na função RPC
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
    -- Deleta atividades atribuídas ao usuário
    delete from public.activities where assigned_user_id = target_user_id;
    
    -- Deleta registros de conclusão de tarefas
    delete from public.completions where user_id = target_user_id;
    
    -- Deleta logs de atividade onde o usuário alvo é o ator ou mencionado
    delete from public.activity_logs where details ilike '%' || target_user_id || '%';

    -- 4. Exclusão do perfil na team_members
    delete from public.team_members where id = target_user_id;

    -- 5. Exclusão definitiva da conta no Supabase Auth
    -- Como a função é SECURITY DEFINER, ela tem privilégios para deletar de auth.users
    delete from auth.users where id = target_user_id;
end;
$function$;

-- Garante que REPLICA IDENTITY FULL está ativo para Realtime detectar mudanças de delete/update
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
