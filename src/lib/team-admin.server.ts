import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Deletes a user from Supabase Auth.
 * This is a highly privileged operation that bypasses RLS.
 */
export async function deleteAuthUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[team-admin.server] Failed to delete auth user:", error);
    throw error;
  }
  return { success: true };
}
