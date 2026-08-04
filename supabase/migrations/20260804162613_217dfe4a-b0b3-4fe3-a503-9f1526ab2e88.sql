-- Liberar o INSERT na tabela team_members para usuários anônimos e autenticados
-- Isso é necessário porque o auth.signUp() pode não ter propagado o token de autenticação a tempo para o INSERT no frontend.
-- Como o sistema já força o status 'pending' no cadastro, o risco de segurança é mitigado pela Sala de Espera.

DO $$ 
BEGIN
    -- Remover política restritiva anterior se existir
    DROP POLICY IF EXISTS "team_members_insert_authenticated" ON public.team_members;
    DROP POLICY IF EXISTS "Allow public insert" ON public.team_members;
END $$;

CREATE POLICY "Allow public insert" ON public.team_members
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Garantir que os papéis tenham permissão de INSERT na tabela
GRANT INSERT ON public.team_members TO anon, authenticated;
