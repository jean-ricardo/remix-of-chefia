-- 1. Setup Single Team and Standardize Data
DO $$
DECLARE
    main_id UUID := 'b427d038-be4d-4fb7-b112-b8b6447f3984';
BEGIN
    -- Ensure the single team exists
    INSERT INTO public.teams (id, name, invite_code)
    VALUES (main_id, 'Empresa Principal', 'MASTER')
    ON CONFLICT (id) DO UPDATE SET name = 'Empresa Principal';
    
    -- Update all foreign keys to point to the single team BEFORE deleting other teams
    UPDATE public.team_members SET team_id = main_id;
    UPDATE public.activities SET team_id = main_id;
    UPDATE public.activity_logs SET team_id = main_id;

    -- Now safe to cleanup other teams
    DELETE FROM public.teams WHERE id <> main_id;
END $$;

-- 2. Restructure team_members: roles and status
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
UPDATE public.team_members SET role = CASE WHEN role IN ('diretor', 'admin', 'gestor') THEN 'master' ELSE 'membro' END;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check CHECK (role IN ('master', 'membro'));

-- Remove status column
ALTER TABLE public.team_members DROP COLUMN IF EXISTS status;

-- 3. Security Helpers
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'master'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_master() TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_master() FROM public;

-- 4. Revamp RLS Policies for Single-Tenant/Role-Based Access
-- Clean slate for policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('teams', 'team_members', 'activities', 'completions', 'reschedules', 'activity_logs'))
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- NEW POLICIES

-- teams
CREATE POLICY "Public read teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master can update teams" ON public.teams FOR UPDATE TO authenticated USING (public.is_master());

-- team_members
CREATE POLICY "Authenticated users can see all members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master can manage members" ON public.team_members FOR ALL TO authenticated USING (public.is_master());
CREATE POLICY "Users can update own profile" ON public.team_members FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- activities
CREATE POLICY "Master can manage all activities" ON public.activities FOR ALL TO authenticated USING (public.is_master());
CREATE POLICY "Users can see all activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their assigned activities" ON public.activities FOR UPDATE TO authenticated USING (assigned_user_id = (SELECT id FROM team_members WHERE user_id = auth.uid()));

-- completions
CREATE POLICY "Authenticated users can see all completions" ON public.completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create completions" ON public.completions FOR INSERT TO authenticated WITH CHECK (true);

-- reschedules
CREATE POLICY "Authenticated users can see all reschedules" ON public.reschedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create reschedules" ON public.reschedules FOR INSERT TO authenticated WITH CHECK (true);

-- activity_logs
CREATE POLICY "Authenticated users can see all logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Cleanup Obsolete Objects
DROP FUNCTION IF EXISTS public.criar_empresa_e_diretor(text, text, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.auth_team_id();
DROP FUNCTION IF EXISTS public.is_director();
