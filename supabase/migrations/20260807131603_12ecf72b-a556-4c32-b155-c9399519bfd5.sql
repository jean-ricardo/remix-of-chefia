-- Adicionar coluna team_id se não existir
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'team_id') THEN
    ALTER TABLE public.activity_logs ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Atualizar logs órfãos com o team_id do ator, se possível
UPDATE public.activity_logs al
SET team_id = tm.team_id
FROM public.team_members tm
WHERE al.actor_name = tm.name
  AND al.team_id IS NULL;

-- Habilitar RLS na tabela de logs se não estiver habilitado
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "activity_logs_select_authenticated" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;

-- Nova política: Usuários só veem logs da sua própria equipe
CREATE POLICY "activity_logs_select_team" ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL OR 
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Nova política: Usuários podem inserir logs (sempre deve incluir seu team_id)
CREATE POLICY "activity_logs_insert_team" ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Nova política: Exclusão permitida apenas para quem tem escopo global (admin/diretor) da mesma equipe
CREATE POLICY "activity_logs_delete_team" ON public.activity_logs
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
      AND (cargo_principal ILIKE 'diretor' OR cargo_principal ILIKE 'admin' OR cargo_principal ILIKE 'adm')
    )
  );

-- Garantir privilégios
GRANT SELECT, INSERT, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
