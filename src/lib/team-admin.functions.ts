import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deleteAuthUser } from "./team-admin.server";

export const deleteUserAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    memberId: z.string(),
    authUserId: z.string().optional()
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Use getUser() to get the authenticated user's ID
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const callerId = authUser?.id;

    if (!callerId) {
      console.error("[team-admin.functions] No callerId found");
      throw new Error("Não foi possível verificar sua sessão. Por favor, saia e entre novamente na plataforma.");
    }

    // Verify admin permissions using supabaseAdmin to ensure we can see the caller's role regardless of RLS
    const { data: caller, error: callerError } = await supabaseAdmin
      .from('team_members')
      .select('role, cargo_principal, user_id')
      .eq('user_id', callerId)
      .maybeSingle();

    if (callerError) {
      console.error("[team-admin.functions] Error fetching caller profile:", callerError);
    }

    const roleStr = (caller?.cargo_principal || caller?.role || "").toLowerCase();
    
    // Expanded list of admin roles
    const isAdmin = ['diretor', 'admin', 'adm', 'master', 'fundador', 'director'].includes(roleStr);

    if (!isAdmin) {
      console.warn(`[team-admin.functions] Access denied for user ${callerId} with role: ${roleStr}`);
      throw new Error(`Acesso negado: apenas administradores podem realizar esta ação. (Cargo detectado: ${roleStr || 'Membro'})`);
    }

    const { error: rpcError } = await supabaseAdmin.rpc('delete_user_account', {
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

export const updateMemberRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    memberId: z.string(),
    newCargo: z.string(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const callerId = authUser?.id;

    if (!callerId) {
      throw new Error("Não foi possível verificar sua sessão. Por favor, saia e entre novamente na plataforma.");
    }

    const { data: caller } = await supabaseAdmin
      .from('team_members')
      .select('cargo_principal, role')
      .eq('user_id', callerId)
      .maybeSingle();

    const roleStr = (caller?.cargo_principal || caller?.role || "").toLowerCase();
    const isAdmin = ['diretor', 'admin', 'adm', 'master', 'fundador', 'director'].includes(roleStr);

    if (!isAdmin) {
      throw new Error(`Acesso negado: apenas administradores podem alterar cargos. (Cargo detectado: ${roleStr || 'Membro'})`);
    }

    const { error } = await supabaseAdmin
      .from("team_members")
      .update({ 
        cargo_principal: data.newCargo,
        role: data.newCargo.charAt(0).toUpperCase() + data.newCargo.slice(1) 
      })
      .eq("id", data.memberId);

    if (error) throw error;

    return { success: true };
  });
