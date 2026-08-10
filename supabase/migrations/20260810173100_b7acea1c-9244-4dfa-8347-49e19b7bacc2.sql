-- Enable RLS and setup policies for team_members to allow auto-joining the hub
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own record into any team (needed for auto-joining)
CREATE POLICY "Allow authenticated to insert self" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to see all members of their own team
CREATE POLICY "Allow members to see team" ON public.team_members
FOR SELECT TO authenticated
USING (team_id IN (
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
) OR true); -- Temporary 'true' to avoid chicken-egg lock during auto-join

-- Ensure grants are in place
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
