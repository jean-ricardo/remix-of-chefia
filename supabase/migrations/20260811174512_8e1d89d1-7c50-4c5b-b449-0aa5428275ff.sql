DO $$
DECLARE
    target_email TEXT := 'jeanricardo147@gmail.com';
    target_user_id UUID;
    new_team_id UUID;
BEGIN
    -- 1. Find the user in auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users. Please ensure the user has signed up first.', target_email;
        RETURN;
    END IF;

    -- 2. Check if the user already has a record in team_members with a non-null team_id
    IF EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE user_id = target_user_id AND team_id IS NOT NULL
    ) THEN
        RAISE NOTICE 'User % already belongs to a team.', target_email;
        RETURN;
    END IF;

    -- 3. Create a new team
    INSERT INTO public.teams (name, invite_code)
    VALUES ('Empresa Principal', 'CHEF-' || upper(substring(gen_random_uuid()::text from 1 for 6)))
    RETURNING id INTO new_team_id;

    -- 4. Create or Update team_member record
    -- Using user_id as the filter. We try to update first, if not exists, insert.
    UPDATE public.team_members 
    SET team_id = new_team_id, 
        role = 'diretor', 
        status = 'aprovado'
    WHERE user_id = target_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.team_members (
            user_id, 
            team_id, 
            name, 
            email, 
            role, 
            status, 
            cargo_principal
        )
        VALUES (
            target_user_id, 
            new_team_id, 
            'Jean Ricardo', 
            target_email, 
            'diretor', 
            'aprovado', 
            'Fundador'
        );
    END IF;

    RAISE NOTICE 'Successfully created team and linked user % as director.', target_email;
END $$;