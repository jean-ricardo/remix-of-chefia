create or replace function public.delete_user_account(target_user_id uuid)
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
    select lower(coalesce(role, cargo_principal, ''))
    into calling_user_role
    from public.team_members
    where id = calling_user_id;

    -- 2. Validação de segurança: apenas 'diretor' ou 'admin' podem prosseguir
    if calling_user_role not in ('diretor', 'admin') then
        raise exception 'Acesso negado: apenas administradores ou diretores podem excluir usuários. (Detectado: %)', calling_user_role;
    end if;

    -- 3. Limpeza de dados
    delete from public.activities where assigned_user_id = target_user_id;
    delete from public.team_members where id = target_user_id;

    -- 4. Exclusão definitiva
    delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.delete_user_account(uuid) to authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;