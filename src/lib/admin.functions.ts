import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const deleteUserAccount = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ targetUserId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    // Dynamically import supabaseAdmin to ensure it stays on the server
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Delete from auth.users (this triggers cascade deletes if configured, 
    // but we usually have manual table cleanup too)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    
    if (authError) {
      console.error("[admin] Error deleting auth user:", authError);
      throw new Error(`Failed to delete auth account: ${authError.message}`);
    }

    // 2. Manual cleanup of team_members just in case the FK doesn't cascade
    const { error: memberError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("user_id", data.targetUserId);

    if (memberError) {
      console.error("[admin] Error deleting team member record:", memberError);
    }

    return { success: true };
  });
