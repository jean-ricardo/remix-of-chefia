-- The team_members table uses a UUID 'id'. 
-- In a standard Supabase setup, we often link the profile ID to the auth.uid().
-- If the application logic expects the 'id' in team_members to be the same as auth.uid():
ALTER POLICY "team_members_insert_authenticated" ON public.team_members
WITH CHECK (auth.uid() IS NOT NULL);

-- Let's also ensure the SELECT policy is solid
-- Currently it is: (( SELECT auth.uid() AS uid) IS NOT NULL)
-- This is fine for authenticated users to see all members (common in team apps).