# Database Security and RLS Standardization

Enforce team-based data isolation and administrative role restrictions at the database level.

## User Review Required

> [!IMPORTANT]
> This plan implements multi-tenant security. Once applied, users will only see data belonging to their own team.

- **Isolation**: Every query will automatically filter by the user's `team_id`.
- **Admin Rights**: Only members with the `diretor` role will be able to approve new members or change roles.
- **Verification**: This uses Supabase RLS (Row Level Security) and a custom security function.

## Technical Details

### Database Schema Changes
- Enable RLS on: `teams`, `team_members`, `activities`, `completions`, `reschedules`, `activity_logs`.
- Create `auth_team_id()` security definer function.
- Add `GRANT` statements for `authenticated` and `service_role` on all affected tables.
- Implement `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies for each table using `team_id = auth_team_id()`.

### team_members Specific Policies
- `SELECT`: Users can see members of their own team.
- `UPDATE (status/role)`: Restrict to `(SELECT role FROM team_members WHERE user_id = auth.uid()) = 'diretor'`.
- `INSERT`: Allowed if the `team_id` matches or during the registration flow.

### Verification Plan
- Run SQL migration and check for successful application.
- Verify RLS status for all tables using `information_schema`.
- Test data isolation (simulated via SQL) to ensure a user cannot see data from another team.
