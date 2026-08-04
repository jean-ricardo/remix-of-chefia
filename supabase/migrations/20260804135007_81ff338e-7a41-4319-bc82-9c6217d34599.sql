-- 1) Remove all public (anon) access policies
DROP POLICY IF EXISTS "public read activities" ON public.activities;
DROP POLICY IF EXISTS "public insert activities" ON public.activities;
DROP POLICY IF EXISTS "public update activities" ON public.activities;
DROP POLICY IF EXISTS "public delete activities" ON public.activities;

DROP POLICY IF EXISTS "public read completions" ON public.completions;
DROP POLICY IF EXISTS "public insert completions" ON public.completions;
DROP POLICY IF EXISTS "public update completions" ON public.completions;
DROP POLICY IF EXISTS "public delete completions" ON public.completions;

DROP POLICY IF EXISTS "public read reschedules" ON public.reschedules;
DROP POLICY IF EXISTS "public insert reschedules" ON public.reschedules;
DROP POLICY IF EXISTS "public update reschedules" ON public.reschedules;
DROP POLICY IF EXISTS "public delete reschedules" ON public.reschedules;

DROP POLICY IF EXISTS "public read team_members" ON public.team_members;
DROP POLICY IF EXISTS "public insert team_members" ON public.team_members;
DROP POLICY IF EXISTS "public update team_members" ON public.team_members;
DROP POLICY IF EXISTS "public delete team_members" ON public.team_members;

-- 2) Revoke Data API privileges from anonymous role
REVOKE ALL ON public.activities FROM anon;
REVOKE ALL ON public.completions FROM anon;
REVOKE ALL ON public.reschedules FROM anon;
REVOKE ALL ON public.team_members FROM anon;
REVOKE ALL ON public.activity_logs FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reschedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activities, public.completions, public.reschedules, public.team_members, public.activity_logs TO service_role;

-- 3) Replace always-true authenticated policies with explicit session checks
DROP POLICY IF EXISTS "Autenticados gerenciam activities" ON public.activities;
CREATE POLICY "activities_select_authenticated" ON public.activities
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "activities_insert_authenticated" ON public.activities
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "activities_update_authenticated" ON public.activities
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "activities_delete_authenticated" ON public.activities
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados gerenciam completions" ON public.completions;
CREATE POLICY "completions_select_authenticated" ON public.completions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "completions_insert_authenticated" ON public.completions
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "completions_update_authenticated" ON public.completions
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "completions_delete_authenticated" ON public.completions
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados gerenciam reschedules" ON public.reschedules;
CREATE POLICY "reschedules_select_authenticated" ON public.reschedules
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "reschedules_insert_authenticated" ON public.reschedules
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "reschedules_update_authenticated" ON public.reschedules
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "reschedules_delete_authenticated" ON public.reschedules
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Autenticados veem team_members" ON public.team_members;
CREATE POLICY "team_members_select_authenticated" ON public.team_members
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "team_members_insert_authenticated" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "team_members_update_authenticated" ON public.team_members
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "team_members_delete_authenticated" ON public.team_members
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- 4) activity_logs: append-only audit trail for authenticated users
DROP POLICY IF EXISTS "Autenticados leem e inserem activity_logs" ON public.activity_logs;
CREATE POLICY "activity_logs_select_authenticated" ON public.activity_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "activity_logs_insert_authenticated" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL);