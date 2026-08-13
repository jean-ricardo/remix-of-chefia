import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const provisionUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => 
    z.object({ 
      userId: z.string().optional().nullable(), 
      email: z.string().email(), 
      name: z.string(), 
      whatsapp: z.string().optional().nullable() 
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const MAIN_TEAM_ID = "b427d038-be4d-4fb7-b112-b8b6447f3984";
    
    console.log(`[provisionUser] Provisioning user ${data.email} (${data.userId})`);

    // 1. Check if user already has a member entry (orphan or pending)
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("team_members")
      .select("id, cargo_principal, role, user_id, name, telefone")
      .ilike("email", data.email)
      .maybeSingle();

    if (fetchError) {
      console.error("[provisionUser] Fetch error:", fetchError);
      throw new Error("Erro ao verificar cadastro existente.");
    }

    if (existing) {
      console.log(`[provisionUser] Updating existing member ${existing.id}`);
      const isPending = String(existing.cargo_principal ?? "").toLowerCase() === "pendente" || !existing.cargo_principal;
      
      const { error: updateError } = await supabaseAdmin
        .from("team_members")
        .update({
          user_id: data.userId || existing.user_id,
          name: data.name || existing.name,
          telefone: data.whatsapp || existing.telefone,
          team_id: MAIN_TEAM_ID,
          cargo_principal: isPending ? "Membro" : existing.cargo_principal,
          role: isPending ? "membro" : (existing.role === "master" || existing.role === "Diretor" ? "master" : "membro")
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[provisionUser] Update error detail:", JSON.stringify(updateError));
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }
    } else {
      console.log(`[provisionUser] Creating new member entry`);
      // First user logic (redundant but safe)
      const { count } = await supabaseAdmin
        .from("team_members")
        .select("id", { count: "exact", head: true });

      const isFirst = (count ?? 0) === 0;

      const { error: insertError } = await supabaseAdmin
        .from("team_members")
        .insert({
          user_id: data.userId,
          team_id: MAIN_TEAM_ID,
          name: data.name,
          email: data.email.toLowerCase(),
          telefone: data.whatsapp || "",
          cargo_principal: isFirst ? "Diretor" : "Membro",
          role: isFirst ? "master" : "membro"
        });

      if (insertError) {
        console.error("[provisionUser] Insert error detail:", JSON.stringify(insertError));
        throw new Error(`Erro ao vincular perfil: ${insertError.message}`);
      }
    }

    return { success: true };
  });
