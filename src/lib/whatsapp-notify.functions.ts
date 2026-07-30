import { createServerFn } from "@tanstack/react-start";

export interface WhatsAppNotifyInput {
  number: string;
  taskTitle: string;
  startDate: string;
  endDate: string;
  platformLink: string;
}

function sanitizeNumber(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

function buildMessage(input: WhatsAppNotifyInput): string {
  return [
    "🔔 *Nova Atividade Atribuída no Chef.IA*",
    "",
    `*Tarefa:* ${input.taskTitle}`,
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

    try {
      const res = await fetch(EVOLUTION_URL, {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: cleaned,
          text: buildMessage(data),
        }),
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
