/**
 * Recorrência simples de tarefas (coluna `recurrence`, TEXT, default 'none').
 * Tarefas antigas (null/undefined) são tratadas como "none".
 */
export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Nenhuma" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

export const RECURRENCE_LABEL_PT: Record<Recurrence, string> = {
  none: "Nenhuma",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

/** Normaliza qualquer valor legado para uma recorrência válida. */
export function normalizeRecurrence(value: unknown): Recurrence {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "daily" || v === "diaria") return "daily";
  if (v === "weekly" || v === "semanal") return "weekly";
  if (v === "monthly" || v === "mensal") return "monthly";
  return "none";
}

export function isRecurring(value: unknown): boolean {
  return normalizeRecurrence(value) !== "none";
}

/** yyyy-MM-dd local, sem conversão UTC. */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Avança uma data (yyyy-MM-dd) pelo intervalo da recorrência.
 * O cálculo parte SEMPRE da data original, nunca da data de conclusão.
 */
export function advanceDate(ymd: string | null | undefined, recurrence: Recurrence): string | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  const base = new Date(y, m - 1, d);
  if (Number.isNaN(base.getTime())) return null;

  if (recurrence === "daily") base.setDate(base.getDate() + 1);
  else if (recurrence === "weekly") base.setDate(base.getDate() + 7);
  else if (recurrence === "monthly") {
    const day = base.getDate();
    base.setDate(1);
    base.setMonth(base.getMonth() + 1);
    // Clamp para meses mais curtos (31 -> 28/30).
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(day, lastDay));
  } else return ymd;

  return ymdLocal(base);
}
