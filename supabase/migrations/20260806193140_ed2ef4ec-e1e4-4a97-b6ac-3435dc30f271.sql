-- 1. Remover políticas genéricas que permitem DELETE/UPDATE para qualquer autenticado
DROP POLICY IF EXISTS "team_members_delete_authenticated" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_authenticated" ON public.team_members;

-- 2. Criar políticas restritivas baseadas em cargo
-- Apenas Diretores e Admins podem deletar via API (embora usemos RPC, é bom ter proteção na tabela)
CREATE POLICY "Admins e Diretores podem deletar membros" 
ON public.team_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE id = auth.uid() 
    AND lower(cargo_principal) IN ('diretor', 'admin', 'adm')
  )
);

-- Apenas Diretores e Admins podem atualizar outros membros
-- Usuários comuns podem atualizar apenas seu próprio perfil (ex: nome, telefone)
CREATE POLICY "Usuários podem atualizar o próprio perfil"
ON public.team_members
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND (
    -- Impede que o usuário mude seu próprio cargo via API para se promover ou se rebaixar se for o último diretor
    -- (A lógica complexa de rebaixamento de diretor já está no frontend, mas aqui bloqueamos alteração de cargo via API direta para membros)
    CASE 
      WHEN (SELECT lower(cargo_principal) FROM public.team_members WHERE id = auth.uid()) = 'membro' 
      THEN (cargo_principal = 'membro') -- Membro não pode mudar cargo
      ELSE true -- Admin/Diretor pode (mas deve seguir as regras de negócio do app)
    END
  )
);

CREATE POLICY "Admins e Diretores podem atualizar qualquer membro"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE id = auth.uid() 
    AND lower(cargo_principal) IN ('diretor', 'admin', 'adm')
  )
);
