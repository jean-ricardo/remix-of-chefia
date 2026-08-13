# Plan: Fix Single-Tenant Auto-Provisioning and Team Binding

The user reported that new users are not being correctly bound to the primary team and are seeing an empty state despite the platform being intended as single-tenant. The investigation shows that while the code attempts to auto-bind, RLS and permission issues might be preventing the `INSERT` or `UPDATE` on `team_members` from the client-side during registration.

## Proposed Changes

### 1. Database & Security
- Ensure `team_members` has the correct `GRANT` statements so `authenticated` users can insert their own profiles.
- Verify the primary team exists (already confirmed: `b427d038-be4d-4fb7-b112-b8b6447f3984`).
- Update the `is_master()` function to ensure it correctly identifies the primary admin.

### 2. Registration Flow (`src/routes/cadastrar.tsx`)
- Shift the `team_members` creation/update logic to a **Server Function**.
- Using a Server Function allows us to use `supabaseAdmin` to bypass RLS for this critical setup step, ensuring the user is *always* linked to the team regardless of client-side RLS quirks.
- Ensure the server function is robust: handles existing orphan records, updates metadata, and returns the session.

### 3. Authentication Logic (`src/lib/auth.tsx`)
- Refine `resolveCurrentUser` to be more resilient if the auto-provisioning didn't happen during registration.
- Ensure it always defaults to the `MAIN_TEAM_ID` for any authenticated user.

### 4. Route Guards (`src/components/auth/RouteGuards.tsx`)
- Ensure users who aren't yet mapped (rare if auto-provisioning works) are not stuck.

## Technical Details

### New Server Function: `provisionUser`
```typescript
// src/lib/provision.functions.ts
export const provisionUser = createServerFn({ method: "POST" })
  .input(z.object({ 
    userId: z.string(), 
    email: z.string(), 
    name: z.string(), 
    whatsapp: z.string() 
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const MAIN_TEAM_ID = "b427d038-be4d-4fb7-b112-b8b6447f3984";
    
    // logic to insert/update team_members using admin client
    // ...
  });
```

### Registration Refactor
Replace the manual `supabase.from('team_members').insert(...)` call in `src/routes/cadastrar.tsx` with a call to this new server function immediately after `signUp`.
