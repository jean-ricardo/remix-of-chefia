# Plan: Simplify to Single-Tenant and Fix Re-registration Bug

## Database Changes (Migration)

1.  **Neutralize Multi-Tenancy**:
    *   Ensure there is exactly one record in the `teams` table (e.g., "Empresa Única").
    *   Update all existing records in `team_members`, `activities`, `activity_logs`, `completions`, and `reschedules` to point to this single `team_id`.
    *   Set `team_id` in all tables to default to this ID and make it non-nullable (optional, but safer to just let the application handle it if we want to keep schema flexible). Actually, we'll keep it simple: just update existing data and simplify RLS.
2.  **Simplify `team_members`**:
    *   Remove the `status` column (every user is active upon link).
    *   Restrict `role` to `'master'` and `'membro'`.
    *   Update existing `'diretor'` to `'master'` and others to `'membro'`.
3.  **Refactor RLS Policies**:
    *   Rewrite all policies to remove team isolation checks (since there is only one team).
    *   Policies will now focus on roles: `master` can do everything, `membro` can only see/act on their own assignments.
    *   Simplify or remove `auth_team_id()` and `is_director()` (replace with `is_master()`).
4.  **Drop Obsolete RPCs**:
    *   Drop `criar_empresa_e_diretor`.
5.  **Fix Deletion Bug (Auth Link)**:
    *   Create a more robust `delete_user_account` or audit existing one to ensure it uses service role to delete from `auth.users`.

## Frontend Changes

1.  **Simplify `src/lib/auth.tsx`**:
    *   Update `AppRole` to `master | membro`.
    *   Remove `pending` and `status` from `CurrentUser`.
    *   In `resolveCurrentUser`:
        *   If the user exists in `team_members`, return them.
        *   If not, check if they are the FIRST user. If so, create them as `master` linked to the single team.
        *   If not the first user, create them as `membro` linked to the single team.
    *   Remove multi-tenant auto-provisioning logic.
2.  **Simplify `src/routes/cadastrar.tsx`**:
    *   Remove the "Join Team" vs "Create Company" toggle.
    *   Simplify the form to just Name, Email, WhatsApp, and Password.
    *   On submit, it just performs standard `signUp`. The `resolveCurrentUser` in `AuthProvider` (via `refreshUser`) will handle the automatic link to the single team.
3.  **Simplify `src/components/auth/RouteGuards.tsx`**:
    *   Remove `PendingApprovalScreen` and logic that redirects to it.
4.  **Update `src/routes/index.tsx`**:
    *   Update role checks from `diretor` to `master`.
5.  **Update `src/routes/equipe.tsx`**:
    *   Remove approval/rejection logic.
    *   Update role management (Master/Membro).
6.  **Fix Re-registration (Frontend Guard)**:
    *   If a user is authenticated but has no `team_members` record, `resolveCurrentUser` will now automatically create the link, so the "disconnected" state is self-healing.

## Technical Details

### SQL Migration Outline
```sql
-- 1. Setup Single Team
DO $$
DECLARE
    main_id UUID := 'b427d038-be4d-4fb7-b112-b8b6447f3984'; -- Standardized ID
BEGIN
    DELETE FROM public.teams WHERE id <> main_id;
    INSERT INTO public.teams (id, name, invite_code)
    VALUES (main_id, 'Empresa Principal', 'MASTER')
    ON CONFLICT (id) DO UPDATE SET name = 'Empresa Principal';
    
    UPDATE public.team_members SET team_id = main_id;
    UPDATE public.activities SET team_id = main_id;
    -- ... and other tables
END $$;

-- 2. Refactor Roles
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
UPDATE public.team_members SET role = CASE WHEN role = 'diretor' THEN 'master' ELSE 'membro' END;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check CHECK (role IN ('master', 'membro'));

-- 3. Remove Status
ALTER TABLE public.team_members DROP COLUMN IF EXISTS status;

-- 4. New RLS Helper
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'master'
  );
$$ LANGUAGE sql;

-- 5. Revamp Policies (Example for activities)
DROP POLICY IF EXISTS "Team isolation" ON public.activities;
CREATE POLICY "Master can manage all" ON public.activities FOR ALL TO authenticated USING (public.is_master());
CREATE POLICY "Membro can see/act on own" ON public.activities FOR SELECT TO authenticated USING (assigned_user_id = (SELECT id FROM team_members WHERE user_id = auth.uid()));
-- ... and so on
```

### Deletion RPC
I will ensure `delete_user_account` is correctly implemented using `SECURITY DEFINER` and calling `delete_user` helper if needed, but since I don't have direct access to `auth.users` deletion via SQL (requires `extensions.http` or similar if not using service role client), I will verify if a service-role helper is available or create a TanStack server function for it if the DB path is restricted. Actually, the user suggested an Edge Function, but in TanStack Start we use `createServerFn` with `supabaseAdmin`.

1. Create `src/lib/admin.functions.ts` to host `deleteUserAccount` which uses `supabaseAdmin`.
2. Update `equipe.tsx` to call this server function.
