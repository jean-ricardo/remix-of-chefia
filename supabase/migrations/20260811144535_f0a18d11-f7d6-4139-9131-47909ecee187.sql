-- 1. Enable Row Level Security on all core tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reschedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions to authenticated users and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reschedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;

GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.team_members TO service_role;
GRANT ALL ON public.activities TO service_role;
GRANT ALL ON public.completions TO service_role;
GRANT ALL ON public.reschedules TO service_role;
GRANT ALL ON public.activity_logs TO service_role;

-- 3. Create the auth_team_id() security definer function
CREATE OR REPLACE FUNCTION public.auth_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id 
  FROM public.team_members 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- 4. Create Policies for 'teams'
CREATE POLICY "Users can view their own team" 
ON public.teams FOR SELECT 
TO authenticated 
USING (id = auth_team_id());

CREATE POLICY "Users can update their own team if they are director" 
ON public.teams FOR UPDATE 
TO authenticated 
USING (
  id = auth_team_id() AND 
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() AND role = 'diretor'
  )
);

-- 5. Create Policies for 'team_members'
CREATE POLICY "Users can view members of their own team" 
ON public.team_members FOR SELECT 
TO authenticated 
USING (team_id = auth_team_id());

CREATE POLICY "Directors can update member status and role" 
ON public.team_members FOR UPDATE 
TO authenticated 
USING (
  team_id = auth_team_id() AND 
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() AND role = 'diretor'
  )
)
WITH CHECK (
  team_id = auth_team_id() AND 
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() AND role = 'diretor'
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.team_members FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Registration flow can insert new members" 
ON public.team_members FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 6. Create Policies for 'activities'
CREATE POLICY "Users can view team activities" 
ON public.activities FOR SELECT 
TO authenticated 
USING (team_id = auth_team_id());

CREATE POLICY "Directors can manage team activities" 
ON public.activities FOR ALL 
TO authenticated 
USING (
  team_id = auth_team_id() AND 
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() AND role = 'diretor'
  )
);

CREATE POLICY "Members can update tasks assigned to them" 
ON public.activities FOR UPDATE 
TO authenticated 
USING (
  team_id = auth_team_id() AND 
  (assigned_user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid()))
);

-- 7. Create Policies for 'completions'
CREATE POLICY "Users can view team completions" 
ON public.completions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = completions.activity_id AND activities.team_id = auth_team_id()
  )
);

CREATE POLICY "Users can manage completions for their team tasks" 
ON public.completions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = completions.activity_id AND activities.team_id = auth_team_id()
  )
);

-- 8. Create Policies for 'reschedules'
CREATE POLICY "Users can view team reschedules" 
ON public.reschedules FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = reschedules.activity_id AND activities.team_id = auth_team_id()
  )
);

CREATE POLICY "Users can manage reschedules for their team tasks" 
ON public.reschedules FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = reschedules.activity_id AND activities.team_id = auth_team_id()
  )
);

-- 9. Create Policies for 'activity_logs'
CREATE POLICY "Users can view team logs" 
ON public.activity_logs FOR SELECT 
TO authenticated 
USING (team_id = auth_team_id());

CREATE POLICY "System/Users can insert team logs" 
ON public.activity_logs FOR INSERT 
TO authenticated 
WITH CHECK (team_id = auth_team_id());
