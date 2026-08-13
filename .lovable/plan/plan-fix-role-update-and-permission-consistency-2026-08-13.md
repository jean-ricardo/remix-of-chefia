# Plan: Fix Role Update and Permission Consistency

The user is experiencing a "não foi possível atualizar o cargo" error when a Director tries to change another member's role. This is likely due to RLS policies or permission mismatches in the `team_members` table updates. Additionally, we need to ensure that roles like "Fundador" and "Diretor" are correctly recognized as administrative across all parts of the app.

## Proposed Changes

### Database & Permissions
- Verify RLS policies on `team_members` to ensure `UPDATE` is allowed for admins (Directors/Masters).
- Add a new migration to explicitly grant `UPDATE` on `team_members` to `authenticated` users who are admins.
- Ensure the `is_master()` function is used consistently in RLS policies.

### Server Functions
- Update `src/lib/team-admin.functions.ts` to include "Fundador" and "Diretor" in all admin checks. (Already partially done, but let's re-verify).
- Create a new server function `updateMemberRole` to handle role changes securely on the server side using `supabaseAdmin`, bypassing potential client-side RLS issues for sensitive fields.

### Frontend Updates
- Modify `src/routes/equipe.tsx`:
    - Replace the client-side `supabase.from("team_members").update(...)` call with the new `updateMemberRole` server function.
    - Ensure `isAdmin` logic consistently recognizes "Diretor", "Fundador", "Master", "Admin", and "Adm".

## Technical Details
- **Server Function**: `updateMemberRole` will validate the caller's identity and role before performing the update.
- **Role Normalization**: Use a centralized utility or consistent mapping for role strings (e.g., lowercase for logic, capitalized for display).

## Verification Plan
- Attempt to change a member's role as a Director in the UI.
- Verify the `team_members` table reflects the change.
- Verify the activity log records the action.
