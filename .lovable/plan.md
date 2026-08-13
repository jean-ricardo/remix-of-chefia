# Plan - Fix Member Removal and Permissions

The user (Director/Founder) is still facing issues when trying to remove members or change roles, reporting session and permission errors. I will strengthen the administrative logic, improve error reporting, and ensure database permissions are fully granted.

## Proposed Changes

### Database (Supabase)
- Update administrative RLS policies for `team_members` to explicitly allow `DELETE` and `UPDATE` for all admin roles (Diretor, Master, Fundador, Admin).
- Standardize the `is_master()` function to be used consistently across all administrative policies.
- Ensure the `delete_user_account` RPC handles the team relationship correctly.
- Add explicit `GRANT` statements for all administrative functions.

### Server Functions
- Improve `deleteUserAccount` and `updateMemberRole` in `src/lib/team-admin.functions.ts` with better logging and more descriptive error messages.
- Ensure the admin check in these functions matches the database logic exactly.
- Use `supabaseAdmin` for the actual data modification to bypass client-side RLS limitations while keeping the permission check strict.

### Frontend
- Update error handling in `src/routes/equipe.tsx` to display the specific error message returned by the server.
- Ensure the `isAdmin` check in the UI is consistent with the server-side logic.

## Technical Details

### Database Migration
- Refine `is_master()` to handle casing and all recognized roles.
- Grant `ALL` on `team_members` to `authenticated` and `service_role`.
- Enable RLS and add policies:
  ```sql
  CREATE POLICY "Admins can manage team members"
  ON public.team_members
  FOR ALL
  TO authenticated
  USING (public.is_master());
  ```

### Server-side Logic
- In `src/lib/team-admin.functions.ts`, explicitly log the `callerId`, `cargo`, and `role` to help diagnose any future issues.
- Return structured error messages instead of generic ones.
