import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Eye,
  Inbox,

  Plus,
  Repeat,
  RotateCw,

} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NewTaskModal } from "@/components/activities/NewTaskModal";
import { EditActivitySheet, type EditMode } from "@/components/activities/EditActivitySheet";
import { TaskDetailsSheet } from "@/components/activities/TaskDetailsSheet";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  type OccurrenceStatus,
  type OccurrenceView,
  type Priority,
  type TeamMember,
} from "@/lib/rotina";
import { canActOnActivity, useCurrentUser } from "@/lib/auth";
import { consumePendingTaskId } from "@/components/auth/RouteGuards";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  validateSearch: zodValidator(
    z.object({
      taskId: fallback(z.string().optional(), undefined),
    }),
  ),
});

function DashboardPage() {
  const qc = useQueryClient();
  // Expose qc to window for direct access in sub-components if needed (though using props/context is better, 
  // here we ensure the logic requested is met).
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
  const navigate = useNavigate({ from: "/" });

  const [filter, setFilter] = useState<string>("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  // Deep-link: open the details sheet when ?taskId=... is present
  // (ou quando o id foi preservado durante o fluxo de login).
  useEffect(() => {
    const pending = search.taskId ?? consumePendingTaskId();
    if (!pending) return;
    setDetailsTaskId(pending);
    // Limpa o parâmetro assim que o modal abre: um F5 futuro não reabre a tarefa.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("taskId");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [search.taskId]);

  function closeDetails() {
    setDetailsTaskId(null);
    if (search.taskId) {
      navigate({ search: (prev: { taskId?: string }) => ({ ...prev, taskId: undefined }), replace: true });
    }
  }


  // Dynamic RBAC schema adaptability: admin + gestor + legacy director aliases
  // all have global scope. Anything else (including undefined) → deny-by-default.
  const rawRole =
    (currentUser as unknown as { role?: string }).role ??
    ((currentUser as unknown as { isAdmin?: boolean }).isAdmin ? "admin" : undefined);
  const isAdmin =
    rawRole === "admin" ||
    rawRole === "gestor" ||
    rawRole === "diretor" ||
    rawRole === "director";
  // Deny-by-default: unknown role -> usuario view; requires a resolved user id.
  const effectiveUserId =
    !isAdmin && currentUser.id && !currentUser.id.startsWith("__")
      ? currentUser.id
      : null;

  const { atrasadas, hoje, proximas, concluidas } = useMemo(() => {
    const compSet = new Set(
      (completions.data ?? []).map((c) => `${c.activity_id}|${c.occurrence_key}`),
    );
    const reMap = new Map(
      (reschedules.data ?? []).map((r) => [
        `${r.activity_id}|${r.original_occurrence_key}`,
        { new_date: r.new_date, justification: r.justification ?? "" },
      ]),
    );

    // Secure filtering engine: apply RBAC BEFORE any occurrence math.
    const assigneeOf = (a: import("@/lib/rotina").Activity): string | null =>
      (a as unknown as { assigned_user_id?: string | null; assignee_id?: string | null })
        .assigned_user_id ??
      (a as unknown as { assignee_id?: string | null }).assignee_id ??
      null;


    const master = (activities.data ?? []).filter((a) => {
      if (!isAdmin) {
        // Deny-by-default: no resolvable user -> no tasks.
        if (!effectiveUserId) return false;
        return assigneeOf(a) === effectiveUserId;
      }
      // Admin/Director extra "focus on member" dropdown (optional).
      if (filter !== "all") return assigneeOf(a) === filter;
      return true;
    });

    const list: OccurrenceView[] = [];
    for (const a of master) {
      const occ = buildOccurrence(a, today, compSet, reMap);
      if (occ && occ.status !== "fora") list.push(occ);
    }

    const bucket = (s: OccurrenceStatus) =>
      list.filter((o) => o.status === s).sort(sortOccurrences);

    // Inbox Zero (dashboard only): hide completed items older than 24h.
    // Fail-safe: if no completion timestamp exists on the item, keep it visible.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const nowMs = today.getTime();
    const within24h = (o: OccurrenceView) => {
      const raw =
        (o as unknown as { completed_at?: string | number | Date }).completed_at ??
        (o as unknown as { updated_at?: string | number | Date }).updated_at;
      if (!raw) return true;
      const t = new Date(raw).getTime();
      if (Number.isNaN(t)) return true;
      return nowMs - t <= DAY_MS;
    };

    return {
      atrasadas: bucket("atrasada"),
      hoje: bucket("hoje"),
      proximas: bucket("proxima"),
      concluidas: bucket("concluida").filter(within24h),
    };
  }, [activities.data, completions.data, reschedules.data, filter, today, isAdmin, effectiveUserId]);

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

  // Anti-flicker lock: block Kanban render until BOTH data and role are resolved.
  // IMMEDIATE redirect for pending users is handled by ProtectedRoute in RouteGuards.
  const isReady = !isLoading && rawRole !== undefined;

  const impersonatedName =
    !isAdmin && currentUser.id && !currentUser.id.startsWith("__")
      ? memberById.get(currentUser.id)?.name
      : null;

  const totalFiltered =
    atrasadas.length + hoje.length + proximas.length + concluidas.length;
  const showMemberEmpty = isReady && !isAdmin && totalFiltered === 0;

  const heroTitle = isAdmin ? "Visão Geral (Diretoria)" : "Minhas Atividades";


  return (
    <>
      <Toaster richColors />
      <div className="space-y-6 pb-24 md:space-y-8 md:pb-8">
        {/* HERO */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <LiveClock />
            <h1 className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-navy md:text-[32px]">
              {heroTitle}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              {isAdmin
                ? "Visão consolidada de toda a equipe — atualizada em tempo real."
                : "Suas atividades atrasadas, para hoje e próximas."}
            </p>

            {currentUser.role !== "admin" && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-navy/5 px-2.5 py-1 text-[11px] font-medium text-navy">
                <Eye className="h-3 w-3" />
                {currentUser.role === "gestor" ? "Modo gestor" : "Modo usuário"}
                {impersonatedName ? (
                  <span className="text-navy/70">· {impersonatedName}</span>
                ) : (
                  <span className="text-navy/70">· selecione um membro no topo</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <label className="hidden text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:block">
                  Visualizar
                </label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="h-10 w-[190px] rounded-lg bg-card sm:w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda a equipe</SelectItem>
                    {(members.data ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <div className="hidden md:block">
              <Button
                onClick={() => setNewTaskOpen(true)}
                className="h-10 gap-1.5 rounded-lg bg-[#185FA5] px-4 font-medium text-white hover:bg-[#042C53]"
              >
                <Plus className="h-4 w-4" />
                Nova Atividade
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => setNewTaskOpen(true)}
          aria-label="Nova atividade"
          className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#D85A30] text-white shadow-lg shadow-[#D85A30]/30 transition-colors hover:bg-[#c24f2a] active:scale-95 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>

        <NewTaskModal isOpen={newTaskOpen} onClose={() => setNewTaskOpen(false)} />

        <TaskDetailsSheet
          taskId={detailsTaskId}
          isOpen={!!detailsTaskId}
          onClose={closeDetails}
        />



        {!isReady ? (
          <BoardLoading />
        ) : showMemberEmpty ? (
          <MemberEmptyState />
        ) : (
          <>
            {/* STAT CARDS: responsive grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Atrasadas"
                count={atrasadas.length}
                tone="danger"
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <StatCard
                label="Para hoje"
                count={hoje.length}
                tone="warning"
                icon={<Clock className="h-5 w-5" />}
              />
              <StatCard
                label="Próx. 7 dias"
                count={proximas.length}
                tone="navy"
                icon={<CalendarClock className="h-5 w-5" />}
              />
              <StatCard
                label="Concluídas hoje"
                count={concluidas.length}
                tone="success"
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
            </div>

            <KanbanBoard
              atrasadas={atrasadas}
              hoje={hoje}
              proximas={proximas}
              concluidas={concluidas}
              memberById={memberById}
              isLoading={false}
              currentUser={currentUser}
              today={today}
            />

          </>
        )}



      </div>
    </>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const label = now
    ? (() => {
        const day = format(now, "EEEE", { locale: ptBR });
        const cap = day.charAt(0).toUpperCase() + day.slice(1);
        return `${cap}, ${format(now, "d 'de' MMMM", { locale: ptBR })} • ${format(now, "HH:mm")}`;
      })()
    : "\u00A0";
  return (
    <p
      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#185FA5]"
      suppressHydrationWarning
    >
      <Clock className="h-3.5 w-3.5 text-[#185FA5]" />
      <span className="truncate">{label}</span>
    </p>
  );
}

function StatCard({
  label,
  count,
  tone,
  icon,
}: {
  label: string;
  count: number;
  tone: "danger" | "warning" | "navy" | "success";
  icon: React.ReactNode;
}) {
  const palette = {
    danger: { num: "text-[#D85A30]", icon: "text-[#D85A30]", chip: "bg-[#D85A30]/10" },
    warning: { num: "text-[#042C53]", icon: "text-[#185FA5]", chip: "bg-[#185FA5]/10" },
    navy: { num: "text-[#042C53]", icon: "text-[#185FA5]", chip: "bg-[#185FA5]/10" },
    success: { num: "text-emerald-600", icon: "text-emerald-600", chip: "bg-emerald-500/10" },
  }[tone];
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span className={cn("rounded-full p-2", palette.chip, palette.icon)}>
          {icon}
        </span>
      </div>
      <div className={cn("mt-2 text-3xl font-bold tabular-nums md:text-4xl", palette.num)}>
        {count}
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  items,
  memberById,
  isLoading,
  emptyIcon: EmptyIcon,
  emptyIconClass,
  emptyTitle,
  emptyMessage,
  showCompletedStyle,
  currentUser,
}: {
  title: string;
  tone: "danger" | "warning" | "navy" | "success";
  items: OccurrenceView[];
  memberById: Map<string, TeamMember>;
  isLoading: boolean;
  emptyIcon: LucideIcon;
  emptyIconClass: string;
  emptyTitle: string;
  emptyMessage: string;
  showCompletedStyle?: boolean;
  currentUser: ReturnType<typeof useCurrentUser>;
}) {
  const dotClass = {
    danger: "bg-danger",
    warning: "bg-amber",
    navy: "bg-navy",
    success: "bg-success",
  }[tone];
  return (
    <section className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm md:p-5">
      <header className="mb-3 flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
        <h2 className="text-base font-semibold text-navy md:text-lg">{title}</h2>
        <span className="ml-auto rounded-full bg-navy/8 px-2 py-0.5 text-[11px] font-semibold text-navy">
          {isLoading ? "…" : items.length}
        </span>
      </header>
      {isLoading ? (
        <TaskCardSkeleton />
      ) : items.length === 0 ? (
        <EmptyStateCard
          icon={EmptyIcon}
          iconClass={emptyIconClass}
          title={emptyTitle}
          message={emptyMessage}
        />
      ) : (
        <PaginatedTaskList
          items={items}
          memberById={memberById}
          completed={!!showCompletedStyle}
          currentUser={currentUser}
        />
      )}
    </section>
  );

}

function EmptyStateCard({
  icon: Icon,
  iconClass,
  title,
  message,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  message: string;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center transition-all hover:border-[#185FA5]/30">
      <Icon size={32} className={cn("mb-3", iconClass)} />
      <h3 className="mb-1 text-base font-bold text-[#042C53]">{title}</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="w-full space-y-2.5" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:p-5"
        >
          <div className="flex gap-2">
            <div className="h-4 w-16 rounded-full bg-gray-200" />
            <div className="h-4 w-20 rounded-full bg-gray-100" />
          </div>
          <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
          <div className="mt-4 flex gap-3">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="h-3 w-24 rounded bg-gray-100" />
            <div className="h-3 w-16 rounded bg-gray-100" />
          </div>
          <div className="mt-4 flex gap-2 border-t border-gray-50 pt-3">
            <div className="h-10 flex-1 rounded-lg bg-gray-100" />
            <div className="h-10 flex-1 rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE = 7;


function PaginatedTaskList({
  items,
  memberById,
  completed,
  currentUser,
}: {
  items: OccurrenceView[];
  memberById: Map<string, TeamMember>;
  completed: boolean;
  currentUser: ReturnType<typeof useCurrentUser>;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  // Clamp page only if it becomes invalid (e.g. items removed).
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col content-start gap-3">
      <ul className="space-y-2.5">
        {visible.map((occ) => (
          <OccurrenceCard
            key={`${occ.activity.id}-${occ.originalKey}`}
            occ={occ}
            memberById={memberById}
            completed={completed}
            currentUser={currentUser}
          />
        ))}
      </ul>
      {items.length > PAGE_SIZE && (
        <nav
          aria-label="Paginação"
          className="mt-1 flex items-center justify-between gap-2 border-t border-border/50 pt-3"
        >
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Página anterior"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#444441] transition-colors hover:bg-[#185FA5]/10 hover:text-[#185FA5] active:bg-[#185FA5]/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#444441]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-medium text-[#444441] sm:text-sm">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Próxima página"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#444441] transition-colors hover:bg-[#185FA5]/10 hover:text-[#185FA5] active:bg-[#185FA5]/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#444441]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </nav>
      )}
    </div>
  );
}


function OccurrenceCard({
  occ,
  memberById,
  completed,
  currentUser,
}: {
  occ: OccurrenceView;
  memberById: Map<string, TeamMember>;
  completed: boolean;
  currentUser: ReturnType<typeof useCurrentUser>;
}) {
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("edit");
  const pointerRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const member = occ.activity.assigned_user_id
    ? memberById.get(occ.activity.assigned_user_id)
    : null;

  // client_name is not in the current DB schema — treated as optional so
  // legacy rows never break. If a future column is added it will surface here.
  const clientName = (occ.activity as { client_name?: string | null }).client_name ?? null;

  const canAct = canActOnActivity(currentUser, occ.activity);

  const cardRecurrence = normalizeRecurrence(
    (occ.activity as { recurrence?: string | null }).recurrence,
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

  /** Clona a tarefa recorrente adiante, a partir do prazo ORIGINAL. */
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
    if (error) {
      console.error("[activities] recurrence clone failed", error);
      return;
    }
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
      toast.error("Não foi possível iniciar: " + error.message);
    } else {
      toast.success("Atividade em andamento");
      // OBRIGATÓRIO: Invalidar cache para que o Kanban re-renderize e mova o card.
      const qc = (window as any).queryClient;
      if (qc) {
        qc.invalidateQueries({ queryKey: ["activities"] });
      }
    }
  }

  async function complete() {
    setBusy(true);
    const { error } = await supabase.from("completions").upsert(
      {
        activity_id: occ.activity.id,
        occurrence_key: occ.originalKey,
      },
      { onConflict: "activity_id,occurrence_key" },
    );
    if (!error) {
      await supabase
        .from("activities")
        .update({ status: "done" } as any)
        .eq("id", occ.activity.id);
      await cloneRecurring();
      
      const qc = (window as any).queryClient;
      if (qc) {
        qc.invalidateQueries({ queryKey: ["completions"] });
        qc.invalidateQueries({ queryKey: ["activities"] });
      }
    }
    setBusy(false);
    if (error) toast.error("Não foi possível concluir: " + error.message);
    else toast.success("Atividade concluída");
  }

  async function reopen() {
    setBusy(true);
    const { error } = await supabase
      .from("completions")
      .delete()
      .eq("activity_id", occ.activity.id)
      .eq("occurrence_key", occ.originalKey);
    setBusy(false);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Conclusão desfeita");
  }

  function openEdit(mode: EditMode) {
    setEditMode(mode);
    setEditOpen(true);
  }

  // Mobile-safe click: ignore when the pointer moved (scroll gesture).
  function handleCardPointerDown(e: React.PointerEvent) {
    pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }
  const navigate = useNavigate({ from: "/" });
  function handleCardClick(e: React.MouseEvent) {
    // Ignore clicks originating from interactive children (buttons, links).
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) return;
    const p = pointerRef.current;
    if (p) {
      const dx = Math.abs(e.clientX - p.x);
      const dy = Math.abs(e.clientY - p.y);
      if (dx > 8 || dy > 8) return; // treated as scroll/swipe
    }
    // Open the premium details sheet via deep-link so WhatsApp URLs share the same flow.
    navigate({ search: (prev: { taskId?: string }) => ({ ...prev, taskId: occ.activity.id }), replace: true });
  }


  const safeDate = (d: Date | null | undefined): Date | null => {
    if (!d) return null;
    const t = d instanceof Date ? d : new Date(d);
    return Number.isNaN(t.getTime()) ? null : t;
  };
  const effective = safeDate(occ.effectiveDate);
  const dateLabel = effective ? format(effective, "EEE, d MMM", { locale: ptBR }) : null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isOverdue = !!effective && !completed && effective.getTime() < startOfToday.getTime();

  const assigneeLabel = member?.name ?? null;

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <li
      onPointerDown={handleCardPointerDown}
      onClick={handleCardClick}
      className={cn(
        "group flex cursor-pointer flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#185FA5]/30 hover:shadow-md",
        completed && "bg-success/5",
      )}
    >
      {/* Top row: priority + assignee */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <PriorityDot priority={occ.activity.priority} />
          {occ.isRescheduled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-navy/20 bg-navy/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
              <RotateCw className="h-3 w-3" />
              Reprogramada
            </span>
          )}
          {!canAct && (
            <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/25 bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Eye className="h-3 w-3" />
              Somente leitura
            </span>
          )}
        </div>
        {assigneeLabel && (
          <span className="shrink-0 truncate text-xs font-medium text-gray-500">
            {assigneeLabel}
          </span>
        )}
      </div>

      {/* Middle: title */}
      <div className="mt-2 min-w-0">
        {clientName && (
          <div className="mb-1 truncate text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {clientName}
          </div>
        )}
        <h3
          className={cn(
            "line-clamp-2 text-base font-semibold leading-snug text-gray-900",
            completed && "text-muted-foreground line-through",
          )}
        >
          {occ.activity.title}
        </h3>

        {occ.isRescheduled && occ.rescheduleJustification && (
          <div className="mt-2.5 rounded-lg border border-navy/15 bg-navy/5 p-2.5 text-xs text-navy">
            <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-navy/70">
              <RotateCw className="h-3 w-3" />
              Justificativa da reprogramação
            </div>
            <p className="whitespace-pre-wrap text-navy/90">
              {occ.rescheduleJustification}
            </p>
          </div>
        )}
      </div>

      {/* Bottom: metadata pills */}
      {(dateLabel || recurrenceDetail) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {dateLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
                isOverdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600",
              )}
            >
              <Calendar className="h-3 w-3" />
              {dateLabel}
            </span>
          )}
          {recurrenceDetail && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500"
              title={`Tarefa recorrente · ${recurrenceDetail}`}
            >
              <Repeat className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {recurrenceDetail}
            </span>
          )}
        </div>
      )}

      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-50 pt-3">
          {completed ? (
            <button
              type="button"
              onClick={stop(reopen)}
              disabled={busy}
              className="h-10 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Desfazer
            </button>
          ) : (
            <>
              {resolveColumn(occ, false) === "todo" && (
                <button
                  type="button"
                  onClick={stop(start)}
                  disabled={busy}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-[#185FA5]/30 hover:bg-[#185FA5]/10 hover:text-[#185FA5] disabled:opacity-50"
                >
                  <Clock className="h-4 w-4" />
                  Iniciar
                </button>
              )}
              <button
                type="button"
                onClick={stop(complete)}
                disabled={busy}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluir
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={stop(() => openEdit("reschedule"))}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-[#185FA5]/30 hover:bg-[#185FA5]/10 hover:text-[#185FA5] disabled:opacity-50"
          >
            <RotateCw className="h-4 w-4" />
            Reprogramar
          </button>
        </div>
      )}

      <EditActivitySheet
        open={editOpen}
        onOpenChange={setEditOpen}
        occurrence={occ}
        mode={editMode}
      />
    </li>
  );
}

function PriorityDot({ priority }: { priority: Priority | null | undefined }) {
  const map: Record<Priority, { dot: string; chip: string; text: string }> = {
    alta: { dot: "bg-red-500", chip: "bg-red-50", text: "text-red-600" },
    media: { dot: "bg-yellow-500", chip: "bg-yellow-50", text: "text-yellow-700" },
    baixa: { dot: "bg-gray-400", chip: "bg-gray-100", text: "text-gray-600" },
  };
  const cfg =
    priority && map[priority]
      ? map[priority]
      : { dot: "bg-gray-300", chip: "bg-gray-100", text: "text-gray-500" };
  const label = priority ? PRIORITY_LABEL[priority] : "Sem prioridade";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        cfg.chip,
        cfg.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}


// ---------- Kanban ----------

// UI label -> DB enum. Never send Portuguese labels to mutations.
export const UI_TO_DB_STATUS = {
  "A Fazer": "TODO",
  "Em Andamento": "IN_PROGRESS",
  "Concluído": "DONE",
} as const;

type ColKey = "todo" | "in_progress" | "done";

function resolveColumn(occ: OccurrenceView, completed: boolean): ColKey {
  if (completed || occ.status === "concluida") return "done";
  const raw = (occ.activity as unknown as { status?: string | null }).status;
  if (raw === "IN_PROGRESS" || raw === "in_progress" || raw === "Em Andamento") {
    return "in_progress";
  }
  // Orphan rescue: null / undefined / unknown -> "A Fazer".
  return "todo";
}

function kanbanSort(a: OccurrenceView, b: OccurrenceView, todayMs: number) {
  const at = a.effectiveDate ? Math.abs(a.effectiveDate.getTime() - todayMs) : Number.POSITIVE_INFINITY;
  const bt = b.effectiveDate ? Math.abs(b.effectiveDate.getTime() - todayMs) : Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  const ac = (a.activity as unknown as { created_at?: string }).created_at;
  const bc = (b.activity as unknown as { created_at?: string }).created_at;
  const acMs = ac ? new Date(ac).getTime() : 0;
  const bcMs = bc ? new Date(bc).getTime() : 0;
  return bcMs - acMs;
}

const COLUMN_PAGE_SIZE = 5;

type PagesState = { todo: number; in_progress: number; done: number };

function KanbanBoard({
  atrasadas,
  hoje,
  proximas,
  concluidas,
  memberById,
  isLoading,
  currentUser,
  today,
}: {
  atrasadas: OccurrenceView[];
  hoje: OccurrenceView[];
  proximas: OccurrenceView[];
  concluidas: OccurrenceView[];
  memberById: Map<string, TeamMember>;
  isLoading: boolean;
  currentUser: ReturnType<typeof useCurrentUser>;
  today: Date;
}) {
  const columns = useMemo(() => {
    const todo: OccurrenceView[] = [];
    const inProgress: OccurrenceView[] = [];
    const done: OccurrenceView[] = [];
    const pushOpen = (occ: OccurrenceView) => {
      const col = resolveColumn(occ, false);
      if (col === "in_progress") inProgress.push(occ);
      else if (col === "done") done.push(occ);
      else todo.push(occ);
    };
    atrasadas.forEach(pushOpen);
    hoje.forEach(pushOpen);
    proximas.forEach(pushOpen);
    concluidas.forEach((o) => done.push(o));

    const t = today.getTime();
    todo.sort((a, b) => kanbanSort(a, b, t));
    inProgress.sort((a, b) => kanbanSort(a, b, t));
    done.sort((a, b) => kanbanSort(a, b, t));
    return { todo, inProgress, done };
  }, [atrasadas, hoje, proximas, concluidas, today]);

  // Independent per-column pagination state.
  const [pages, setPages] = useState<PagesState>({ todo: 1, in_progress: 1, done: 1 });

  // Orphan-page protection: if a column shrinks below the current page,
  // clamp instantly to the new last page (min 1).
  useEffect(() => {
    setPages((prev) => {
      const totals: PagesState = {
        todo: Math.max(1, Math.ceil(columns.todo.length / COLUMN_PAGE_SIZE)),
        in_progress: Math.max(1, Math.ceil(columns.inProgress.length / COLUMN_PAGE_SIZE)),
        done: Math.max(1, Math.ceil(columns.done.length / COLUMN_PAGE_SIZE)),
      };
      let next = prev;
      (Object.keys(totals) as Array<keyof PagesState>).forEach((k) => {
        if (prev[k] > totals[k]) {
          if (next === prev) next = { ...prev };
          next[k] = totals[k];
        }
      });
      return next;
    });
  }, [columns]);

  const setPage = (key: keyof PagesState, page: number) =>
    setPages((prev) => ({ ...prev, [key]: page }));

  return (
    <div className="-mx-4 flex snap-x snap-mandatory flex-row gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 md:mx-0 md:grid md:h-[calc(100vh-16rem)] md:min-h-[600px] md:snap-none md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
      <KanbanColumn
        title="A Fazer"
        accent="bg-[#185FA5]"
        items={columns.todo}
        page={pages.todo}
        onPageChange={(p) => setPage("todo", p)}
        memberById={memberById}
        currentUser={currentUser}
        isLoading={isLoading}
        emptyIcon={Inbox}
        emptyIconClass="text-gray-400"
        emptyTitle="Nada a fazer"
        emptyMessage="Sua fila está vazia."
      />
      <KanbanColumn
        title="Em Andamento"
        accent="bg-amber-500"
        items={columns.inProgress}
        page={pages.in_progress}
        onPageChange={(p) => setPage("in_progress", p)}
        memberById={memberById}
        currentUser={currentUser}
        isLoading={isLoading}
        emptyIcon={Clock}
        emptyIconClass="text-gray-400"
        emptyTitle="Nada em andamento"
        emptyMessage="Comece uma tarefa quando estiver pronto."
      />
      <KanbanColumn
        title="Concluído"
        accent="bg-emerald-500"
        items={columns.done}
        page={pages.done}
        onPageChange={(p) => setPage("done", p)}
        memberById={memberById}
        currentUser={currentUser}
        isLoading={isLoading}
        completedStyle
        emptyIcon={CheckCircle}
        emptyIconClass="text-emerald-500"
        emptyTitle="Nada concluído ainda"
        emptyMessage="As entregas de hoje aparecem aqui."
      />
    </div>
  );
}

function KanbanColumn({
  title,
  accent,
  items,
  page,
  onPageChange,
  memberById,
  currentUser,
  isLoading,
  completedStyle,
  emptyIcon,
  emptyIconClass,
  emptyTitle,
  emptyMessage,
}: {
  title: string;
  accent: string;
  items: OccurrenceView[];
  page: number;
  onPageChange: (page: number) => void;
  memberById: Map<string, TeamMember>;
  currentUser: ReturnType<typeof useCurrentUser>;
  isLoading: boolean;
  completedStyle?: boolean;
  emptyIcon: LucideIcon;
  emptyIconClass: string;
  emptyTitle: string;
  emptyMessage: string;
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / COLUMN_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * COLUMN_PAGE_SIZE;
  const visible = useMemo(
    () => items.slice(start, start + COLUMN_PAGE_SIZE),
    [items, start],
  );
  const showPager = items.length > COLUMN_PAGE_SIZE;

  return (
    <div className="flex min-w-[85vw] snap-center flex-col md:min-w-0 md:snap-none">
      <header className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("h-2 w-2 rounded-full", accent)} />
        <h2 className="text-sm font-semibold text-[#042C53] md:text-base">{title}</h2>
        <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
          {isLoading ? "…" : items.length}
        </span>
      </header>
      <div className="flex max-h-[75vh] min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-50/60 md:max-h-none">
        <div className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-hide">
          {isLoading ? (
            <TaskCardSkeleton />
          ) : items.length === 0 ? (
            <EmptyStateCard
              icon={emptyIcon}
              iconClass={emptyIconClass}
              title={emptyTitle}
              message={emptyMessage}
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((occ) => (
                <OccurrenceCard
                  key={`${occ.activity.id}-${occ.originalKey}`}
                  occ={occ}
                  memberById={memberById}
                  completed={!!completedStyle || occ.status === "concluida"}
                  currentUser={currentUser}
                />
              ))}
            </ul>
          )}
        </div>
        {showPager && !isLoading && (
          <div className="mt-auto flex items-center justify-between rounded-b-xl border-t border-gray-200/60 bg-gray-50/95 p-3 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Página anterior"
              className="rounded-md p-2 transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 text-gray-700" />
            </button>
            <span className="text-xs font-semibold text-gray-600">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage === totalPages}
              aria-label="Próxima página"
              className="rounded-md p-2 transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm"
        />
      ))}
    </div>
  );
}

function MemberEmptyState() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-[#042C53] md:text-2xl">Bom trabalho!</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 md:text-base">
        Você não tem atividades pendentes no momento.
      </p>
    </div>
  );
}

