-- 1. Adicionar o campo status à tabela team_members
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente';

-- 2. Adicionar a Check Constraint
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_status_check;

ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_status_check 
CHECK (status IN ('pendente', 'aprovado'));

-- 3. Conceder permissões (essencial para TanStack Start e PostgREST)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

-- 4. Rodar a atualização única para membros ativos (que já têm user_id)
UPDATE public.team_members 
SET status = 'aprovado' 
WHERE user_id IS NOT NULL 
AND status = 'pendente';
