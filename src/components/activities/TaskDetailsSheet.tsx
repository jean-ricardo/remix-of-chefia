import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Loader2,
  Lock,
  RotateCw,
  User as UserIcon,
  X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  buildOccurrence,
  PRIORITY_LABEL,
  RECURRENCE_LABEL,
  WEEKDAY_LONG,
  type Activity,
  type OccurrenceView,
  type Priority,
} from "@/lib/rotina";
import {
  useActivities,
  useCompletions,
  useReschedules,
  useTeamMembers,
} from "@/lib/useRotina";
import { hasGlobalScope, useCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export type TaskStatus = "todo" | "in_progress" | "done";

interface Props {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Optional pre-built occurrence (from dashboard click). If absent, we fetch by id. */
  occurrence?: OccurrenceView | null;
}

/**
 * Premium Task Details Sheet.
 * - RBAC:
 *   - admin/gestor: full edit affordances.
 *   - usuario: locked read-only text for title/description/assignee.
 *     Status + reschedule (date + justification) remain editable.
 * - Reschedule is DB-safe (PATCH-only): inserts into `reschedules`
 *   using only { activity_id, original_occurrence_key, new_date, justification }.
 *   The parent `activities` row is NEVER rewritten from this sheet.
 * - When the current status is "done", the reschedule action is disabled
 *   with premium micro-copy — enforced reactively on local status state.
 */
export function TaskDetailsSheet({ taskId, isOpen, onClose, occurrence }: Props) {
  const qc = useQueryClient();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();
  const members = useTeamMembers();
  const currentUser = useCurrentUser();
  const isReadOnly = !hasGlobalScope(currentUser.role);

  const today = useMemo(() => new Date(), [isOpen, taskId]);

  // If deep-linked and the activity is not yet in the cached list, fetch it.
  const deepFetch = useQuery({
    queryKey: ["activity", taskId],
    enabled: !!taskId && isOpen && !occurrence && !(activities.data ?? []).some((a) => a.id === taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,title,assigned_user_id,priority,recurrence_type,weekday,month_day,due_date")
        .eq("id", taskId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Activity | null;
    },
  });

  const activity: Activity | null = useMemo(() => {
    if (occurrence) return occurrence.activity;
    if (!taskId) return null;
    return (
      (activities.data ?? []).find((a) => a.id === taskId) ??
      deepFetch.data ??
      null
    );
  }, [occurrence, taskId, activities.data, deepFetch.data]);

  const view: OccurrenceView | null = useMemo(() => {
    if (occurrence) return occurrence;
    if (!activity) return null;
    const compSet = new Set(
      (completions.data ?? []).map((c) => `${c.activity_id}|${c.occurrence_key}`),
    );
    const reMap = new Map(
      (reschedules.data ?? []).map((r) => [
        `${r.activity_id}|${r.original_occurrence_key}`,
        { new_date: r.new_date, justification: r.justification ?? "" },
      ]),
    );
    return buildOccurrence(activity, today, compSet, reMap);
  }, [occurrence, activity, completions.data, reschedules.data, today]);

  const member = activity?.assigned_user_id
    ? (members.data ?? []).find((m) => m.id === activity.assigned_user_id) ?? null
    : null;

  const initialStatus: TaskStatus = view?.completed ? "done" : "todo";
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  // Reschedule local state (PATCH payload only)
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Prefill with the current effective date so the picker is anchored.
    const d = view?.effectiveDate;
    setRescheduleDate(
      d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate(),
          ).padStart(2, "0")}`
        : "",
    );
    setRescheduleReason("");
  }, [isOpen, view?.effectiveDate]);

  const loading =
    (!activity && (deepFetch.isLoading || activities.isLoading)) || !view;

  // Reactive lock: derives instantly from local status without waiting for refetch.
  const rescheduleLocked = status === "done";

  async function handleStatusChange(next: TaskStatus) {
    if (!activity || !view) return;
    const prev = status;
    setStatus(next);
    setSaving(true);
    try {
      if (next === "done" && !view.completed) {
        // PATCH-safe: only id + occurrence key inserted into completions.
        const { error } = await supabase.from("completions").upsert(
          { activity_id: activity.id, occurrence_key: view.originalKey },
          { onConflict: "activity_id,occurrence_key" },
        );
        if (error) throw error;
        void logActivity({
          actorName: currentUser.name,
          actionType: "status",
          details: `Concluiu a atividade "${activity.title}".`,
          taskId: activity.id,
        });
        toast.success("Atividade marcada como concluída");
      } else if (next !== "done" && view.completed) {
        const { error } = await supabase
          .from("completions")
          .delete()
          .eq("activity_id", activity.id)
          .eq("occurrence_key", view.originalKey);
        if (error) throw error;
        void logActivity({
          actorName: currentUser.name,
          actionType: "status",
          details: `Reabriu a atividade "${activity.title}".`,
          taskId: activity.id,
        });
        toast.success("Conclusão desfeita");
      } else if (next === "in_progress") {
        toast.message("Marcada em andamento (visual)", {
          description: "Sincronizamos com o servidor quando a coluna estiver disponível.",
        });
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["completions"] }),
        qc.invalidateQueries({ queryKey: ["activities"] }),
      ]);
    } catch (e) {
      setStatus(prev);
      toast.error("Não foi possível atualizar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule() {
    if (!activity || !view) return;
    if (rescheduleLocked) return;
    if (!rescheduleDate) {
      toast.error("Selecione a nova data.");
      return;
    }
    setRescheduling(true);
    try {
      // PATCH-safe: ONLY the minimal payload — never rewrites the activity row.
      const { error } = await supabase.from("reschedules").insert({
        activity_id: activity.id,
        original_occurrence_key: view.originalKey,
        new_date: rescheduleDate,
        justification: rescheduleReason.trim(),
      });
      if (error) throw error;
      void logActivity({
        actorName: currentUser.name,
        actionType: "reschedule",
        details: `Reprogramou "${activity.title}" para ${rescheduleDate.split("-").reverse().join("/")}${
          rescheduleReason.trim() ? ` — ${rescheduleReason.trim()}` : ""
        }.`,
        taskId: activity.id,
      });
      toast.success("Atividade reprogramada");
      await qc.invalidateQueries({ queryKey: ["reschedules"] });
    } catch (e) {
      toast.error("Não foi possível reprogramar: " + (e as Error).message);
    } finally {
      setRescheduling(false);
    }
  }

  // Legacy schema doesn't include description/start/end — polished fallbacks.
  const description =
    (activity as (Activity & { description?: string | null }) | null)?.description ?? null;
  const startDate =
    (activity as (Activity & { start_date?: string | null }) | null)?.start_date ?? null;
  const endDate = view?.effectiveDate
    ? format(view.effectiveDate, "d 'de' MMM, yyyy", { locale: ptBR })
    : activity?.due_date
      ? format(new Date(activity.due_date), "d 'de' MMM, yyyy", { locale: ptBR })
      : null;

  const recurrenceLabel = (() => {
    if (!activity) return null;
    if (activity.recurrence_type === "semanal" && activity.weekday != null)
      return `Semanal · ${WEEKDAY_LONG[activity.weekday]}`;
    if (activity.recurrence_type === "mensal" && activity.month_day != null)
      return `Mensal · dia ${activity.month_day}`;
    return RECURRENCE_LABEL[activity.recurrence_type];
  })();

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        {loading || !activity || !view ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#185FA5]" />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Sticky header */}
            <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-white px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#185FA5]">
                    Detalhes da atividade
                  </p>
                  {isReadOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                      <Lock className="h-2.5 w-2.5" />
                      Somente leitura
                    </span>
                  )}
                </div>
                {isReadOnly ? (
                  <ReadOnlyBlock className="mt-2">
                    <h2 className="text-2xl font-bold leading-tight text-[#042C53]">
                      {activity.title}
                    </h2>
                  </ReadOnlyBlock>
                ) : (
                  <h2 className="mt-1 text-2xl font-bold leading-tight text-gray-900">
                    {activity.title}
                  </h2>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto bg-[#F7F6F2] px-5 py-5">
              <dl className="grid grid-cols-2 gap-4">
                <MetaField
                  label="Atribuído a"
                  icon={<UserIcon className="h-3.5 w-3.5" />}
                  locked={isReadOnly}
                  value={
                    isReadOnly ? (
                      <ReadOnlyBlock>
                        <span className="text-sm font-semibold text-[#042C53]">
                          {member?.name ?? "Não atribuído"}
                        </span>
                      </ReadOnlyBlock>
                    ) : (
                      member?.name ?? <Empty>Não atribuído</Empty>
                    )
                  }
                  className="col-span-2"
                />
                <MetaField
                  label="Prioridade"
                  value={<PriorityBadge priority={activity.priority} />}
                />
                <MetaField
                  label="Início"
                  icon={<CalendarIcon className="h-3.5 w-3.5" />}
                  value={
                    startDate ? (
                      format(new Date(startDate), "d 'de' MMM, yyyy", { locale: ptBR })
                    ) : (
                      <Empty>Não informado</Empty>
                    )
                  }
                />
                <MetaField
                  label="Vencimento"
                  icon={<CalendarIcon className="h-3.5 w-3.5" />}
                  value={endDate ?? <Empty>Sem data</Empty>}
                  className="col-span-2"
                />
                {recurrenceLabel && (
                  <MetaField
                    label="Recorrência"
                    icon={<RotateCw className="h-3.5 w-3.5" />}
                    value={recurrenceLabel}
                    className="col-span-2"
                  />
                )}
              </dl>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Descrição
                  {isReadOnly && <Lock className="h-3 w-3 text-gray-400" />}
                </div>
                {description ? (
                  isReadOnly ? (
                    <ReadOnlyBlock>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#042C53]">
                        {description}
                      </p>
                    </ReadOnlyBlock>
                  ) : (
                    <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                      {description}
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm italic text-gray-400">
                    Nenhuma descrição informada
                  </div>
                )}
              </div>

              {view.isRescheduled && view.rescheduleJustification && (
                <div className="mt-5 rounded-lg border border-[#185FA5]/20 bg-[#185FA5]/5 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#185FA5]">
                    <RotateCw className="h-3 w-3" />
                    Justificativa da reprogramação
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[#042C53]">
                    {view.rescheduleJustification}
                  </p>
                </div>
              )}

              {/* Reschedule action — available to all roles, locked when Done */}
              <div className="mt-6 rounded-xl border border-border/60 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#042C53]">
                    <RotateCw className="h-3.5 w-3.5 text-[#185FA5]" />
                    Reprogramar atividade
                  </div>
                  {rescheduleLocked && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Concluída
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "space-y-3",
                    rescheduleLocked && "pointer-events-none opacity-50",
                  )}
                  aria-disabled={rescheduleLocked}
                >
                  <div>
                    <label
                      htmlFor="reschedule-date"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Nova data
                    </label>
                    <input
                      id="reschedule-date"
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      disabled={rescheduleLocked || rescheduling}
                      className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reschedule-reason"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                    >
                      Justificativa (opcional)
                    </label>
                    <textarea
                      id="reschedule-reason"
                      rows={2}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      disabled={rescheduleLocked || rescheduling}
                      placeholder="Motivo da reprogramação…"
                      className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#042C53] placeholder:text-muted-foreground/70 focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleReschedule}
                    disabled={rescheduleLocked || rescheduling}
                    className="h-11 w-full bg-[#185FA5] font-semibold text-white hover:bg-[#042C53]"
                  >
                    {rescheduling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reprogramando…
                      </>
                    ) : (
                      "Confirmar reprogramação"
                    )}
                  </Button>
                </div>

                {rescheduleLocked && (
                  <p className="mt-2 text-xs italic text-gray-400">
                    Tarefas concluídas não podem ser reprogramadas.
                  </p>
                )}
              </div>
            </div>

            {/* Sticky footer */}
            <div className="border-t border-border/60 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </label>
              <div className="flex items-center gap-2">
                <Select
                  value={status}
                  onValueChange={(v) => handleStatusChange(v as TaskStatus)}
                  disabled={saving}
                >
                  <SelectTrigger
                    className={cn(
                      "h-11 flex-1 bg-white",
                      saving && "opacity-60",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin text-[#185FA5]" />
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaField({
  label,
  value,
  icon,
  className,
  locked,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  locked?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {icon}
        {label}
        {locked && <Lock className="ml-0.5 h-2.5 w-2.5 text-gray-400" />}
      </dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

/**
 * High-contrast read-only block for `usuario` role — replaces disabled inputs
 * that would otherwise look washed-out on mobile.
 */
function ReadOnlyBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#042C53]/10 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(4,44,83,0.03)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="italic text-gray-400">{children}</span>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    alta: "bg-red-50 text-red-600",
    media: "bg-yellow-50 text-yellow-700",
    baixa: "bg-blue-50 text-[#185FA5]",
  };
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
        map[priority] ?? "bg-gray-100 text-gray-600",
      )}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
