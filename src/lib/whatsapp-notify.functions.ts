import { createServerFn } from "@tanstack/react-start";

export interface WhatsAppNotifyInput {
  number: string;
  taskTitle: string;
  startDate: string;
  endDate: string;
  platformLink: string;
  /** Nome real do usuário autenticado que executou a ação. */
  actorName?: string;
  /** Tipo de evento que originou a notificação. */
  action?: "create" | "update";
}

function sanitizeNumber(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

function buildMessage(input: WhatsAppNotifyInput): string {
  const actor = (input.actorName ?? "").trim();
  const verb = input.action === "update" ? "atualizou" : "criou";
  const headline =
    input.action === "update"
      ? "🔄 *Atividade Atualizada no Chef.IA*"
      : "🔔 *Nova Atividade Atribuída no Chef.IA*";

  return [
    headline,
    "",
    actor
      ? `👤 *${actor}* acabou de ${verb} a atividade: *${input.taskTitle}*`
      : `*Tarefa:* ${input.taskTitle}`,
    "",
    `📅 *Início:* ${input.startDate}`,
    `⏳ *Prazo:* ${input.endDate}`,
    "",
    `🔗 *Acesse para mais detalhes:* ${input.platformLink}`,
  ].join("\n");
}

export const sendWhatsAppNotification = createServerFn({ method: "POST" })
  .inputValidator((data: WhatsAppNotifyInput) => data)
  .handler(async ({ data }) => {
    const cleaned = sanitizeNumber(data.number);
    if (!cleaned) return { ok: false, skipped: true };

    // Credentials live only in server-side secrets (never in the bundle).
    const url = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!url || !apiKey) {
      console.error("[whatsapp-notify] missing EVOLUTION_API_URL / EVOLUTION_API_KEY");
      return { ok: false, skipped: true };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: cleaned,
          text: buildMessage(data),
        }),
        // Timeout curto: a notificação nunca pode segurar o worker.
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[whatsapp-notify] Evolution API failed", res.status, body);
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error("[whatsapp-notify] Evolution API error", err);
      return { ok: false };
    }
  });
