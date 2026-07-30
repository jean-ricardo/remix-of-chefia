import type { TeamMember } from "./rotina";

/**
 * Resolve o número de WhatsApp do responsável.
 * Prioridade: coluna `telefone` de team_members (somente leitura) →
 * fallback local salvo no perfil. Nenhuma escrita/alteração de schema.
 */
export function resolveMemberWhatsApp(
  memberId: string | null | undefined,
  members: TeamMember[] | undefined,
): string | null {
  if (!memberId) return null;

  const fromDb = (members ?? []).find((m) => m.id === memberId)?.telefone;
  if (fromDb && String(fromDb).replace(/\D/g, "").length >= 10) {
    return String(fromDb);
  }

  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`chefia_whatsapp_${memberId}`);
  } catch {
    return null;
  }
}

export function formatDateBR(iso: string | undefined | null): string {
  if (!iso) return "Sem data";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function platformLink(taskId?: string | null): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://chef.ia";
  return taskId ? `${origin}/?taskId=${taskId}` : origin;
}
