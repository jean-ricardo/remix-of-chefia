
CREATE TYPE public.activity_priority AS ENUM ('alta','media','baixa');
CREATE TYPE public.recurrence_type AS ENUM ('diaria','semanal','mensal','unica');

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO anon, authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read team_members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "public insert team_members" ON public.team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "public update team_members" ON public.team_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete team_members" ON public.team_members FOR DELETE USING (true);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  assigned_user_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  priority public.activity_priority NOT NULL DEFAULT 'media',
  recurrence_type public.recurrence_type NOT NULL,
  weekday int,
  month_day int,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "public insert activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "public update activities" ON public.activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete activities" ON public.activities FOR DELETE USING (true);

CREATE TABLE public.completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  occurrence_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, occurrence_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.completions TO anon, authenticated;
GRANT ALL ON public.completions TO service_role;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read completions" ON public.completions FOR SELECT USING (true);
CREATE POLICY "public insert completions" ON public.completions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update completions" ON public.completions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete completions" ON public.completions FOR DELETE USING (true);

CREATE TABLE public.reschedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  original_occurrence_key text NOT NULL,
  new_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, original_occurrence_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reschedules TO anon, authenticated;
GRANT ALL ON public.reschedules TO service_role;
ALTER TABLE public.reschedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reschedules" ON public.reschedules FOR SELECT USING (true);
CREATE POLICY "public insert reschedules" ON public.reschedules FOR INSERT WITH CHECK (true);
CREATE POLICY "public update reschedules" ON public.reschedules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete reschedules" ON public.reschedules FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reschedules;
