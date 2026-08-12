import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const sendInviteEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    role: z.enum(["member", "admin"]),
    invitedByName: z.string()
  }))
  .handler(async ({ data }) => {
    const signupUrl = typeof process !== 'undefined' && process.env.VITE_URL 
      ? `${process.env.VITE_URL}/cadastrar` 
      : "https://routine-flow-78.lovable.app/cadastrar"; // Fallback to current project URL

    const url = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!url || !apiKey) {
      console.error("[sendInviteEmail] missing EVOLUTION_API_URL / EVOLUTION_API_KEY");
      return { success: false, message: "Serviço de notificação não configurado." };
    }

    const message = [
      `👋 *Olá!*`,
      ``,
      `Você foi convidado por *${data.invitedByName}* para se juntar à equipe no *Chef.IA*.`,
      ``,
      `Como *${data.role === 'admin' ? 'Administrador' : 'Membro'}*, você poderá gerenciar e acompanhar as atividades da rotina em tempo real.`,
      ``,
      `👉 *Para começar, crie sua conta no link abaixo:*`,
      signupUrl,
      ``,
      `_Seja bem-vindo(a)!_`
    ].join("\n");

    try {
      // In a real scenario, if we had a dedicated email service, we'd use it.
      // Since the user is complaining about email, and we have Evolution API (WhatsApp),
      // maybe they meant WhatsApp? Or maybe they expect the system to send an email via Supabase?
      // Supabase's invite system requires a user to be created.
      
      // Let's try to use the Evolution API if it's actually configured for email (some versions support it)
      // or more likely, we should just report what's happening.
      
      // However, the user specifically mentions "email".
      // If no email provider is configured in Supabase, invitations won't be sent.
      
      // For now, let's implement a more robust invitation process that actually creates a pending member
      // so even if the email fails, they appear in the "Aguardando aprovação" list if they sign up.
      
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      
      // Check if user already exists in team_members
      const { data: existing } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .ilike('email', data.email)
        .maybeSingle();
        
      if (!existing) {
        // Create a placeholder member so they are recognized when they sign up
        const MAIN_TEAM_ID = "b427d038-be4d-4fb7-b112-b8b6447f3984";
        await supabaseAdmin
          .from('team_members')
          .insert({
            email: data.email,
            name: data.email.split('@')[0], // Provide a temporary name as it's required
            team_id: MAIN_TEAM_ID,
            cargo_principal: "pendente",
            role: data.role === 'admin' ? 'Admin' : 'Membro'
          });
      }

      // If we had a Resend key, we'd use it here.
      // Since we don't, we'll try to use Supabase's built-in invite if possible, 
      // but that usually requires a redirect URL.
      
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        redirectTo: signupUrl,
        data: {
          role: data.role
        }
      });

      if (inviteError) {
        console.error("[sendInviteEmail] Supabase invite error:", inviteError);
        // If it's a "provider not configured" error, we should tell the user.
        if (inviteError.message.includes("SMTP")) {
          return { success: false, message: "O servidor de e-mail não está configurado. Por favor, envie o link manualmente." };
        }
        throw inviteError;
      }

      return { success: true, message: "Convite enviado com sucesso!" };
    } catch (err: any) {
      console.error("[sendInviteEmail] error:", err);
      return { success: false, message: err.message || "Erro ao enviar convite." };
    }
  });