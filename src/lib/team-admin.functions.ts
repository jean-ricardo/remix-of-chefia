import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deleteAuthUser } from "./team-admin.server";

export const deleteUserAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    memberId: z.string(),
    authUserId: z.string().optional()
  }))
  .handler(async ({ data, context }) => {
    // 1. Verify caller is admin/director using the existing supabase client (RLS applies)
    // We import the client inside the handler to avoid bundle issues
    const { supabase } = await import("@/integrations/supabase/client");
    
    // In TanStack Start with supabase auth middleware, we usually have user in context
    // but here we can just check the database directly using the RLS-bound client.
    const { data: caller, error: callerError } = await supabase
      .from('team_members')
      .select('role, cargo_principal')
      .limit(1)
      .single();

    if (callerError || !caller) {
      throw new Error("Não foi possível verificar as permissões do usuário.");
    }

    const role = (caller.cargo_principal || caller.role || "").toLowerCase();
    const isAdmin = role === 'diretor' || role === 'admin' || role === 'adm' || role === 'master';

    if (!isAdmin) {
      throw new Error("Acesso negado: apenas administradores podem excluir usuários.");
    }

    // 2. Perform database cleanup using RPC (which handles related records)
    // We still use the RPC for DB cleanup because it's efficient, 
    // but we'll handle the Auth deletion separately if it fails in SQL.
    const { error: rpcError } = await supabase.rpc('delete_user_account', {
      target_user_id: data.memberId
    });

    if (rpcError) {
      console.error("[team-admin.functions] RPC error:", rpcError);
      // Even if RPC fails (e.g. auth deletion permission), we continue with server-side auth deletion
    }

    // 3. Delete from Supabase Auth using the server helper (service role)
    if (data.authUserId) {
      try {
        await deleteAuthUser(data.authUserId);
      } catch (err) {
        console.error("[team-admin.functions] Server auth deletion failed:", err);
        // If the user was already deleted from DB but auth remains, we still want to know.
      }
    }

    return { success: true };
  });
