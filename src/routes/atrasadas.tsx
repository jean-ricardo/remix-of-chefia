import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Eye,
  RotateCw,
} from "lucide-react";
import { TaskDetailsSheet } from "@/components/activities/TaskDetailsSheet";
import { EditActivitySheet } from "@/components/activities/EditActivitySheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  RECURRENCE_LABEL_PT,
  advanceDate,
  normalizeRecurrence,
} from "@/lib/recurrence";
import {
  useActivities,
  useCompletions,
  useReschedules,
  useRotinaRealtime,
  useTeamMembers,
} from "@/lib/useRotina";
import {
  buildOccurrence,
  PRIORITY_LABEL,
  sortOccurrences,
  WEEKDAY_LONG,
  type OccurrenceView,
  type Priority,
  type TeamMember,
} from "@/lib/rotina";
import { canActOnActivity, useCurrentUser, hasGlobalScope } from "@/lib/auth";

export const Route = createFileRoute("/atrasadas")({
  component: AtrasadasPage,
  validateSearch: zodValidator(
    z.object({
      taskId: fallback(z.string().optional(), undefined),
    }),
  ),
});

function AtrasadasPage() {
  const qc = useQueryClient();
  useEffect(() => {
    (window as any).queryClient = qc;
  }, [qc]);
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();
  const currentUser = useCurrentUser();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/atrasadas" });

  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (search.taskId) {
      setDetailsTaskId(search.taskId);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("taskId");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [search.taskId]);

  const isAdmin = hasGlobalScope(currentUser.role);
  const effectiveUserId = !isAdmin && currentUser.id && !currentUser.id.startsWith("__")
    ? currentUser.id
    : null;

  const atrasadas = useMemo(() => {
    const compSet = new Set(
      (completions.data ?? []).map((c) => `${c.activity_id}|${c.occurrence_key}`)
    );
    const reMap = new Map(
      (reschedules.data ?? []).map((r) => [
        `${r.activity_id}|${r.original_occurrence_key}`,
        { new_date: r.new_date, justification: r.justification ?? "" },
      ])
    );

    const master = (activities.data ?? []).filter((a) => {
      if (!isAdmin) {
        if (!effectiveUserId) return false;
        return (a.assigned_user_id || (a as any).assignee_id) === effectiveUserId;
      }
      return true;
    });

    const list: OccurrenceView[] = [];
    for (const a of master) {
      const occ = buildOccurrence(a, today, compSet, reMap);
      if (occ && occ.status === "atrasada" && !occ.completed) {
        list.push(occ);
      }
    }

    return list.sort(sortOccurrences);
  }, [activities.data, completions.data, reschedules.data, today, isAdmin, effectiveUserId]);

  const memberById = useMemo(() => {
    const m = new Map<string, TeamMember>();
    (members.data ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [members.data]);

  const isLoading =
    activities.isLoading ||
    completions.isLoading ||
    reschedules.isLoading ||
    members.isLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background p-4 md:p-8">
      <Toaster richColors />
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D85A30]">
          {isAdmin ? "STATUS" : "ATIVIDADES"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#042C53] md:text-[32px]">
          Atividades atrasadas
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          {isAdmin 
            ? "Gestão de todas as atividades pendentes da equipe que já passaram do prazo."
            : "Suas atividades que estão com o prazo vencido."}
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : atrasadas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-emerald-100 p-4 text-emerald-600">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h2 className="text-xl font-bold text-navy">Tudo em dia!</h2>
            <p className="mt-2 text-muted-foreground">
              Nenhuma atividade atrasada no momento.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {atrasadas.map((occ) => (
            <OccurrenceCard
              key={`${occ.activity.id}-${occ.originalKey}`}
              occ={occ}
              memberById={memberById}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      <TaskDetailsSheet
        taskId={detailsTaskId}
        isOpen={!!detailsTaskId}
        onClose={() => setDetailsTaskId(null)}
      />
    </div>
  );
}

function OccurrenceCard({
  occ,
  memberById,
  currentUser,
}: {
  occ: OccurrenceView;
  memberById: Map<string, TeamMember>;
  currentUser: any;
}) {
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const pointerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const navigate = useNavigate();

  const member = occ.activity.assigned_user_id
    ? memberById.get(occ.activity.assigned_user_id)
    : null;

  const canAct = canActOnActivity(currentUser, occ.activity);
  const cardRecurrence = normalizeRecurrence(
    (occ.activity as any).recurrence,
  );

  const recurrenceDetail = (() => {
    const a = occ.activity;
    switch (a.recurrence_type) {
      case "diaria":
        return "Diária (seg–sex)";
      case "semanal":
        return a.weekday != null ? `Semanal · ${WEEKDAY_LONG[a.weekday]}` : "Semanal";
      case "mensal":
        return a.month_day != null ? `Mensal · dia ${a.month_day}` : "Mensal";
      case "unica":
        return cardRecurrence === "none" ? null : RECURRENCE_LABEL_PT[cardRecurrence];
    }
  })();

  async function cloneRecurring() {
    const a = occ.activity;
    if (cardRecurrence === "none") return;
    const nextDue = advanceDate(a.due_date ?? occ.originalKey, cardRecurrence);
    if (!nextDue) return;
    const { error } = await supabase.from("activities").insert({
      title: a.title,
      assigned_user_id: a.assigned_user_id,
      priority: a.priority,
      recurrence_type: a.recurrence_type,
      weekday: a.weekday,
      month_day: a.month_day,
      due_date: nextDue,
      recurrence: cardRecurrence,
    });
    if (error) return;
    toast.success(`Próxima ocorrência criada para ${format(new Date(`${nextDue}T00:00:00`), "dd/MM/yyyy")}`);
  }

  async function start() {
    setBusy(true);
    const { error } = await supabase
      .from("activities")
      .update({ status: "in_progress" } as any)
      .eq("id", occ.activity.id);
    setBusy(false);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Atividade em andamento");
      const qc = (window as any).queryClient;
      if (qc) qc.invalidateQueries({ queryKey: ["activities"] });
    }
  }

  async function complete() {
    setBusy(true);
    const { error } = await supabase.from("completions").upsert(
      { activity_id: occ.activity.id, occurrence_key: occ.originalKey },
      { onConflict: "activity_id,occurrence_key" }
    );
    if (!error) {
      await supabase.from("activities").update({ status: "done" } as any).eq("id", occ.activity.id);
      await cloneRecurring();
      const qc = (window as any).queryClient;
      if (qc) {
        qc.invalidateQueries({ queryKey: ["completions"] });
        qc.invalidateQueries({ queryKey: ["activities"] });
      }
    }
    setBusy(false);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Atividade concluída");
  }

  function handleCardPointerDown(e: React.PointerEvent) {
    pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function handleCardClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) return;
    const p = pointerRef.current;
    if (p) {
      const dx = Math.abs(e.clientX - p.x);
      const dy = Math.abs(e.clientY - p.y);
      if (dx > 8 || dy > 8) return;
    }
    // @ts-ignore
    navigate({ search: (prev: any) => ({ ...prev, taskId: occ.activity.id }), replace: true });
  }

  const effective = occ.effectiveDate;
  const dateLabel = effective ? format(effective, "EEE, d MMM", { locale: ptBR }) : null;

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div
      onPointerDown={handleCardPointerDown}
      onClick={handleCardClick}
      className="group flex cursor-pointer flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#185FA5]/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <PriorityDot priority={occ.activity.priority} />
        {member?.name && (
          <span className="shrink-0 truncate text-xs font-medium text-gray-500">
            {member.name}
          </span>
        )}
      </div>

      <div className="mt-2 min-w-0">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900">
          {occ.activity.title}
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">
          <Calendar className="h-3 w-3" />
          {dateLabel}
        </span>
        {recurrenceDetail && (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500">
            <RotateCw className="h-3.5 w-3.5" />
            {recurrenceDetail}
          </span>
        )}
      </div>

      {canAct && (
        <div className="mt-4 flex gap-2 border-t border-gray-50 pt-3">
          <button
            onClick={stop(start)}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Clock className="h-4 w-4" />
            Iniciar
          </button>
          <button
            onClick={stop(complete)}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir
          </button>
        </div>
      )}
      
      <EditActivitySheet
        open={editOpen}
        onOpenChange={setEditOpen}
        occurrence={occ}
        mode="edit"
      />
    </div>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    alta: "bg-red-500",
    media: "bg-yellow-500",
    baixa: "bg-gray-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", map[priority] || "bg-gray-300")} />
      {PRIORITY_LABEL[priority] || priority}
    </span>
  );
}

