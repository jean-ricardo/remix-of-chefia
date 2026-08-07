create or replace function public.delete_team_member(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    calling_user_id uuid := auth.uid();
    calling_user_role text;
begin
    -- 1. Buscar o cargo de quem está chamando a função na tabela team_members
    select lower(coalesce(cargo_principal, ''))
    into calling_user_role
    from public.team_members
    where user_id = calling_user_id;

    -- 2. Validação de segurança: apenas 'diretor' ou 'admin' podem prosseguir
    if calling_user_role not in ('diretor', 'admin') then
        raise exception 'Acesso negado: apenas administradores ou diretores podem excluir membros da equipe. (Detectado: %)', calling_user_role;
    end if;

    -- 3. Limpeza de dados referenciados ao membro na equipe
    delete from public.activities where assigned_user_id = target_member_id;
    delete from public.team_members where id = target_member_id;

    -- NOTA: Não deletamos de auth.users. O usuário perde o acesso à equipe específica,
    -- mas mantém sua conta global para criar ou entrar em outras equipes.
end;
$$;

grant execute on function public.delete_team_member(uuid) to authenticated;
grant execute on function public.delete_team_member(uuid) to service_role;
