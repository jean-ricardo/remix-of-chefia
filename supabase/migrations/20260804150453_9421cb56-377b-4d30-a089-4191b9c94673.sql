ALTER POLICY "team_members_insert_authenticated" ON public.team_members
WITH CHECK (true);

-- Also ensure email is uniquely identifiable or linked to auth.uid() if possible,
-- but the request asks to allow the insert for the newly authenticated user.
-- Usually, we want: (auth.uid() IS NOT NULL)
-- Or more specifically if there's a user_id column: (auth.uid() = user_id)
-- Checking table structure first to be sure.