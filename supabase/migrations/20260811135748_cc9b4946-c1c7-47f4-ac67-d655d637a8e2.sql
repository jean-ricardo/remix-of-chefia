-- 1. Update existing records
-- We use a case-insensitive check.
-- If it matches any of the 'admin', 'gestor', 'diretor', 'director', it becomes 'diretor'.
-- Otherwise, it becomes 'membro'.
UPDATE public.team_members
SET role = CASE 
    WHEN LOWER(role) IN ('admin', 'gestor', 'diretor', 'director') THEN 'diretor'
    ELSE 'membro'
END;

-- 2. Add the check constraint
-- This ensures only 'diretor' and 'membro' are allowed from now on.
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('diretor', 'membro'));
