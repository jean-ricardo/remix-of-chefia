import { format, addDays, startOfDay, differenceInCalendarDays, parseISO } from "date-fns";

export type Priority = "alta" | "media" | "baixa";
export type RecurrenceType = "diaria" | "semanal" | "mensal" | "unica";

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
}

export interface Activity {
  id: string;
  title: string;
  assigned_user_id: string | null;
  priority: Priority;
  recurrence_type: RecurrenceType;
  weekday: number | null;
  month_day: number | null;
  due_date: string | null;
}

export interface Completion {
  activity_id: string;
  occurrence_key: string;
}

export interface Reschedule {
  activity_id: string;
  original_occurrence_key: string;
  new_date: string;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  mensal: "Mensal",
  unica: "Única",
};

export const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Compute the "current" occurrence date for an activity, relative to `today`.
 * - diaria: today
 * - semanal: the chosen weekday of the current week (using today as anchor)
 * - mensal: the chosen day of the current month
 * - unica: the due_date itself
 */
export function currentOccurrenceDate(activity: Activity, today: Date): Date | null {
  const base = startOfDay(today);
  switch (activity.recurrence_type) {
    case "diaria":
      return base;
    case "semanal": {
      if (activity.weekday == null) return null;
      const diff = activity.weekday - base.getDay();
      return addDays(base, diff);
    }
    case "mensal": {
      if (activity.month_day == null) return null;
      const d = new Date(base.getFullYear(), base.getMonth(), activity.month_day);
      return d;
    }
    case "unica":
      return activity.due_date ? parseISO(activity.due_date) : null;
  }
}

/**
 * Compute the NEXT occurrence date strictly in the future (>= today+1 for recurring).
 * Used for "próximos 7 dias" when current occurrence has already passed today.
 */
export function nextOccurrenceDate(activity: Activity, today: Date): Date | null {
  const base = startOfDay(today);
  switch (activity.recurrence_type) {
    case "diaria":
      return addDays(base, 1);
    case "semanal": {
      if (activity.weekday == null) return null;
      let diff = activity.weekday - base.getDay();
      if (diff <= 0) diff += 7;
      return addDays(base, diff);
    }
    case "mensal": {
      if (activity.month_day == null) return null;
      let d = new Date(base.getFullYear(), base.getMonth(), activity.month_day);
      if (d <= base) d = new Date(base.getFullYear(), base.getMonth() + 1, activity.month_day);
      return d;
    }
    case "unica":
      return activity.due_date ? parseISO(activity.due_date) : null;
  }
}

export type OccurrenceStatus = "atrasada" | "hoje" | "proxima" | "concluida" | "fora";

export interface OccurrenceView {
  activity: Activity;
  originalKey: string; // YYYY-MM-DD of the original computed occurrence (unshifted)
  effectiveDate: Date; // possibly shifted by reschedule
  isRescheduled: boolean;
  status: OccurrenceStatus;
  completed: boolean;
}

export function buildOccurrence(
  activity: Activity,
  today: Date,
  completions: Set<string>, // key = activityId + "|" + occurrence_key
  reschedules: Map<string, string>, // key = activityId + "|" + occurrence_key -> new_date
): OccurrenceView | null {
  const base = startOfDay(today);
  let occ = currentOccurrenceDate(activity, base);
  if (!occ) return null;

  // For "unica", due_date already reflects reschedule (per spec). No reschedule row expected.
  const originalKey = ymd(occ);
  const rescheduleKey = `${activity.id}|${originalKey}`;
  const newDateStr = reschedules.get(rescheduleKey);
  let effectiveDate = occ;
  let isRescheduled = false;
  if (newDateStr && activity.recurrence_type !== "unica") {
    effectiveDate = parseISO(newDateStr);
    isRescheduled = true;
  }

  // For unica activities that already passed and were completed, they're done.
  const completed = completions.has(`${activity.id}|${originalKey}`);

  // Determine display: prefer showing the current (possibly past-due) occurrence.
  // If already completed and it's today's occurrence, mark "concluida" (only for today).
  const diff = differenceInCalendarDays(startOfDay(effectiveDate), base);

  let status: OccurrenceStatus;
  if (completed) {
    // Completed today counts as "concluida hoje" if effective date is today OR original was today
    if (diff === 0 || differenceInCalendarDays(startOfDay(occ), base) === 0) {
      status = "concluida";
    } else {
      // Completed but not today's occurrence — for recurring, we should try to show the NEXT one instead.
      if (activity.recurrence_type === "unica") {
        status = "concluida";
      } else {
        // Look at the next occurrence for recurring activities that already had this occurrence completed.
        const next = nextOccurrenceDate(activity, base);
        if (!next) return null;
        const nextKey = ymd(next);
        const nextRescheduleKey = `${activity.id}|${nextKey}`;
        const nextNew = reschedules.get(nextRescheduleKey);
        const nextEffective = nextNew ? parseISO(nextNew) : next;
        const nextCompleted = completions.has(`${activity.id}|${nextKey}`);
        const nextDiff = differenceInCalendarDays(startOfDay(nextEffective), base);
        return {
          activity,
          originalKey: nextKey,
          effectiveDate: nextEffective,
          isRescheduled: !!nextNew,
          completed: nextCompleted,
          status: nextCompleted
            ? "concluida"
            : nextDiff < 0
              ? "atrasada"
              : nextDiff === 0
                ? "hoje"
                : nextDiff <= 7
                  ? "proxima"
                  : "fora",
        };
      }
    }
  } else {
    if (diff < 0) status = "atrasada";
    else if (diff === 0) status = "hoje";
    else if (diff <= 7) status = "proxima";
    else status = "fora";
  }

  return { activity, originalKey, effectiveDate, isRescheduled, completed, status };
}

export function sortOccurrences(a: OccurrenceView, b: OccurrenceView): number {
  const p = PRIORITY_ORDER[a.activity.priority] - PRIORITY_ORDER[b.activity.priority];
  if (p !== 0) return p;
  return a.effectiveDate.getTime() - b.effectiveDate.getTime();
}
