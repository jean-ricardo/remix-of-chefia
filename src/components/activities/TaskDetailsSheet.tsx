import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Loader2,
  Lock,
  RotateCw,
  User as UserIcon,
  ChevronLeft,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  buildOccurrence,
  PRIORITY_LABEL,
  WEEKDAY_LONG,
  type Activity,
  type OccurrenceView,
} from "@/lib/rotina";
import { useActivities, useCompletions, useReschedules, useTeamMembers } from "@/lib/useRotina";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { sendWhatsAppNotification } from "@/lib/whatsapp-notify.functions";
import { formatDateBR, platformLink } from "@/lib/taskNotify";
import { logActivity } from "@/lib/activityLog";

function toYmd(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

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
  const qc = useQueryClient();
  const notify = useServerFn(sendWhatsAppNotification);

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const creatorMember = useMemo(() => {
    const cid = activity?.created_by;
    if (!cid) return null;
    return (members.data ?? []).find(m => m.id === cid) ?? null;
  }, [activity?.created_by, members.data]);

  const loading = (!activity && (deepFetch.isLoading || activities.isLoading)) || !view;

  useEffect(() => {
    if (isOpen) {
      setIsRescheduling(false);
      setSubmitting(false);
      if (view?.effectiveDate) {
        setDueDate(toYmd(view.effectiveDate));
      }
      setReason("");
    }
  }, [isOpen, view?.effectiveDate]);

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!activity || !view || submitting) return;

    if (!dueDate) {
      toast.error("Selecione a nova data.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Informe a justificativa.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("reschedules").insert({
      activity_id: activity.id,
      original_occurrence_key: view.originalKey,
      new_date: dueDate,
      justification: reason.trim(),
    });

    if (error) {
      console.error("[reschedules] insert failed", error);
      toast.error("Erro ao reprogramar atividade");
      setSubmitting(false);
      return;
    }

    await logActivity({
      actorName: currentUser.name,
      actionType: "reschedule",
      details: `${currentUser.name} reprogramou "${activity.title}" para ${formatDateBR(dueDate)}${
        reason.trim() ? ` — Justificativa: ${reason.trim()}` : ""
      }.`,
      taskId: activity.id,
    });

    // Notify the CREATOR (created_by)
    const creatorPhone = creatorMember?.telefone;
    const isSelfAction = activity.created_by === currentUser.id;

    if (creatorPhone && !isSelfAction) {
      void notify({
        data: {
          number: creatorPhone,
          taskTitle: activity.title,
          startDate: formatDateBR(dueDate),
          endDate: formatDateBR(dueDate),
          platformLink: platformLink(activity.id),
          actorName: currentUser.name,
          action: "reschedule",
          justification: reason.trim(),
        },
      }).catch(console.error);
    }

    await qc.invalidateQueries({ queryKey: ["reschedules"] });
    setSubmitting(false);
    toast.success("Atividade reprogramada com sucesso!");
    setIsRescheduling(false);
    onClose();
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {loading || !activity || !view ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#185FA5]" />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border/60 bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                {isRescheduling && (
                  <button onClick={() => setIsRescheduling(false)} className="mr-1">
                    <ChevronLeft className="h-5 w-5 text-gray-500" />
                  </button>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#185FA5]">
                  {isRescheduling ? "Reprogramar atividade" : "Detalhes da atividade"}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#F7F6F2] px-5 py-6">
              {/* Common Header Info (Read-only) */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold leading-tight text-navy">
                  {activity.title}
                </h2>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Responsável:</span> {member?.name ?? "Não atribuído"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Criador:</span> {creatorMember?.name ?? "Sistema"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Data Atual:</span> {format(view.effectiveDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                </div>
                {activity.description && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Descrição</p>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{activity.description}</p>
                  </div>
                )}
              </div>

              {!isRescheduling ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <MetaField label="Prioridade" value={PRIORITY_LABEL[activity.priority]} />
                    <MetaField label="Recorrência" value={activity.recurrence_type} />
                  </div>

                  {!view.completed && (
                    <div className="pt-4">
                      <Button
                        onClick={() => setIsRescheduling(true)}
                        className="w-full h-12 gap-2 bg-[#185FA5] hover:bg-[#042C53] text-white font-bold rounded-xl"
                      >
                        <RotateCw className="h-4 w-4" />
                        Reprogramar
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleReschedule} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-navy/70">
                      Nova Data de Vencimento
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-navy/70">
                      Justificativa
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explique o motivo da reprogramação..."
                      required
                      className="w-full min-h-[120px] p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-12 w-full bg-[#185FA5] hover:bg-[#042C53] text-white font-bold rounded-xl shadow-lg"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        "Confirmar Reprogramação"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsRescheduling(false)}
                      disabled={submitting}
                      className="h-12 w-full text-gray-500 font-medium"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
