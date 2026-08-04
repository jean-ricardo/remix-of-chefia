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
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

export type TaskStatus = "todo" | "in_progress" | "done";

interface Props {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  occurrence?: OccurrenceView | null;
}

export function TaskDetailsSheet({ taskId, isOpen, onClose, occurrence }: Props) {
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();
  const members = useTeamMembers();
  const currentUser = useCurrentUser();

  const today = useMemo(() => new Date(), [isOpen, taskId]);

  const deepFetch = useQuery({
    queryKey: ["activity", taskId],
    enabled: !!taskId && isOpen && !occurrence && !(activities.data ?? []).some((a) => a.id === taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,title,assigned_user_id,priority,recurrence_type,weekday,month_day,due_date,description,status,created_by")
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

  const isGlobal = hasGlobalScope(currentUser.role);
  const authorId = (activity as any)?.created_by;
  const isAuthor = authorId === currentUser.id;
  const canEditBase = isGlobal || isAuthor;
  const isReadOnly = !canEditBase;

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

  const loading = (!activity && (deepFetch.isLoading || activities.isLoading)) || !view;

  const description = (activity as any)?.description ?? null;
  const startDate = (activity as any)?.start_date ?? null;
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
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {loading || !activity || !view ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#185FA5]" />
          </div>
        ) : (
          <div className="flex h-full flex-col">
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
                <div className="mt-1 truncate text-xs text-gray-500">
                  {(() => {
                    const creatorId = activity?.created_by;
                    if (!creatorId) return "Criada por: Sistema";
                    const creatorMember = (members.data ?? []).find(m => m.id === creatorId);
                    return `Criada por: ${creatorMember?.name || "Membro"}`;
                  })()}
                </div>
              </div>
            </div>

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
                <MetaField label="Prioridade" value={<PriorityBadge priority={activity.priority} />} />
                <MetaField
                  label="Início"
                  icon={<CalendarIcon className="h-3.5 w-3.5" />}
                  value={startDate ? format(new Date(startDate), "d 'de' MMM, yyyy", { locale: ptBR }) : <Empty>Não informado</Empty>}
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
                {isReadOnly ? (
                  <ReadOnlyBlock>
                    {description ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#042C53]">{description}</p>
                    ) : (
                      <p className="text-sm italic text-gray-400">Nenhuma descrição informada</p>
                    )}
                  </ReadOnlyBlock>
                ) : (
                  <div className="space-y-2">
                    {description ? (
                      <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">{description}</div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm italic text-gray-400">Nenhuma descrição informada</div>
                    )}
                  </div>
                )}
              </div>

              {view.isRescheduled && view.rescheduleJustification && (
                <div className="mt-5 rounded-lg border border-[#185FA5]/20 bg-[#185FA5]/5 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#185FA5]">
                    <RotateCw className="h-3 w-3" />
                    Justificativa da reprogramação
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-[#042C53]">{view.rescheduleJustification}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaField({ label, value, icon, className, locked }: { label: string; value: React.ReactNode; icon?: React.ReactNode; className?: string; locked?: boolean }) {
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

function ReadOnlyBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-[#042C53]/10 bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(4,44,83,0.03)]", className)}>{children}</div>;
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
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium", map[priority] ?? "bg-gray-100 text-gray-600")}>{PRIORITY_LABEL[priority]}</span>;
}
