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
    
    // We trust the bearer token provided by TanStack Start middleware.
    // However, if session verification fails, we fall back to a more permissive check
    // or detailed logging to understand why the callerId is missing.
    const callerId = context.userId;

    if (!callerId) {
      console.error("[team-admin.functions] No context.userId found. Headers:", context.headers);
      throw new Error("Sessão não identificada. Por favor, recarregue a página e tente novamente.");
    }

    // Verify admin permissions using supabaseAdmin
    const { data: caller, error: callerError } = await supabaseAdmin
      .from('team_members')
      .select('role, cargo_principal, user_id')
      .eq('user_id', callerId)
      .maybeSingle();

    if (callerError) {
      console.error("[team-admin.functions] Error fetching caller profile:", callerError);
    }

    const cargoStr = (caller?.cargo_principal || "").toLowerCase();
    const roleStr = (caller?.role || "").toLowerCase();
    
    console.log(`[team-admin.functions] Caller ${callerId} attempting deletion. Cargo: ${cargoStr}, Role: ${roleStr}`);

    // Check if the user has any admin-level cargo or role
    const isAdmin = [
      'diretor', 'admin', 'adm', 'master', 'fundador', 'director'
    ].some(r => cargoStr === r || roleStr === r);

    if (!isAdmin) {
      console.warn(`[team-admin.functions] Access denied for user ${callerId}.`);
      throw new Error(`Acesso negado: apenas administradores podem remover membros. (Cargo atual: ${caller?.cargo_principal || 'Membro'})`);
    }

    const { error: rpcError } = await supabaseAdmin.rpc('delete_user_account', {
      target_member_id: data.memberId
    });

    if (rpcError) {
      console.error("[team-admin.functions] RPC error during deletion:", rpcError);
      throw new Error("Erro ao processar a remoção no banco de dados.");
    }

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
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const callerId = context.userId;

    if (!callerId) {
      throw new Error("Sessão não identificada. Por favor, recarregue a página e tente novamente.");
    }

    const { data: caller } = await supabaseAdmin
      .from('team_members')
      .select('cargo_principal, role')
      .eq('user_id', callerId)
      .maybeSingle();

    const cargoStr = (caller?.cargo_principal || "").toLowerCase();
    const roleStr = (caller?.role || "").toLowerCase();
    
    const isAdmin = [
      'diretor', 'admin', 'adm', 'master', 'fundador', 'director'
    ].some(r => cargoStr === r || roleStr === r);

    if (!isAdmin) {
      throw new Error(`Acesso negado: apenas administradores podem alterar cargos. (Cargo atual: ${caller?.cargo_principal || 'Membro'})`);
    }

    const { error } = await supabaseAdmin
      .from("team_members")
      .update({ 
        cargo_principal: data.newCargo,
        role: data.newCargo.charAt(0).toUpperCase() + data.newCargo.slice(1) 
      })
      .eq("id", data.memberId);

    if (error) {
      console.error("[team-admin.functions] Error updating role:", error);
      throw new Error("Erro ao atualizar o cargo no banco de dados.");
    }

    return { success: true };
  });
