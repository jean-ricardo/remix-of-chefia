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
  action?: "create" | "update" | "complete" | "reschedule";
  /** Justificativa opcional para reprogramação. */
  justification?: string;
}

function sanitizeNumber(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

const HEADLINE: Record<NonNullable<WhatsAppNotifyInput["action"]>, string> = {
  create: "📋 *Nova Atividade no Chef.IA*",
  update: "🔄 *Atividade Atualizada*",
  complete: "✅ *Atividade Concluída*",
  reschedule: "📅 *Atividade Reprogramada*",
};

function buildMessage(input: WhatsAppNotifyInput): string {
  const actor = (input.actorName ?? "").trim();
  const action = input.action ?? "create";
  const headline = HEADLINE[action];

  const actorLine = actor
    ? `*${actor}*`
    : "*Um usuário*";

  const bodyLines: string[] = [];

  switch (action) {
    case "create":
      bodyLines.push(
        `${actorLine} criou a atividade: *${input.taskTitle}*`,
        "",
        `*Início:* ${input.startDate}`,
        `*Prazo:* ${input.endDate}`,
      );
      break;
    case "update":
      bodyLines.push(
        `${actorLine} atualizou os detalhes da atividade: *${input.taskTitle}*`,
      );
      break;
    case "reschedule":
      bodyLines.push(
        `${actorLine} alterou os prazos da atividade: *${input.taskTitle}*`,
        input.justification ? `*Motivo:* ${input.justification}` : "",
      );
      break;
    case "complete":
      bodyLines.push(
        `${actorLine} concluiu a atividade: *${input.taskTitle}*`,
      );
      break;
  }

  bodyLines.push("", `*Acesse:* ${input.platformLink}`);

  return [headline, "", ...bodyLines].join("\n");
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
