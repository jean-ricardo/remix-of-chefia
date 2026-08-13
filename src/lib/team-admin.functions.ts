import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deleteAuthUser } from "./team-admin.server";

export const deleteUserAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    memberId: z.string(),
    authUserId: z.string().optional()
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data: caller, error: callerError } = await supabase
      .from('team_members')
      .select('role, cargo_principal')
      .limit(1)
      .single();

    if (callerError || !caller) {
      throw new Error("Não foi possível verificar as permissões do usuário.");
    }

    const role = (caller.cargo_principal || caller.role || "").toLowerCase();
    const isAdmin = role === 'diretor' || role === 'admin' || role === 'adm' || role === 'master' || role === 'fundador';

    if (!isAdmin) {
      throw new Error("Acesso negado: apenas administradores podem excluir usuários.");
    }

    const { error: rpcError } = await supabase.rpc('delete_user_account', {
      target_user_id: data.memberId
    });

    if (rpcError) {
      console.error("[team-admin.functions] RPC error:", rpcError);
    }

    // We no longer delete the auth.users account by default to allow users to sign up again with the same email.
    // The user's team_members profile is already deleted by the RPC above.
    // If the admin really wants to clear an auth trace, they can use cleanupOrphanedAuthUser.


    return { success: true };
  });

export const cleanupOrphanedAuthUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email()
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Check if user exists in auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === data.email.toLowerCase());
    
    if (!targetUser) {
      return { success: true, message: "Usuário não encontrado no Auth." };
    }
    
    // 2. Check if user exists in public.team_members
    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .ilike('email', data.email)
      .maybeSingle();
      
    if (member) {
      return { success: false, message: "Usuário ainda possui perfil na equipe. Remova-o pela lista de membros." };
    }
    
    // 3. Clean up auth user
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
    if (delError) throw delError;
    
    return { success: true, message: "Resquício de conta removido com sucesso." };
  });
