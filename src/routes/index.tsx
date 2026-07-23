import { createFileRoute } from "@tanstack/react-router";
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
  Flag,
  Inbox,
  Plus,
  RotateCw,
  User as UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NewActivitySheet } from "@/components/activities/NewActivitySheet";
import { EditActivitySheet, type EditMode } from "@/components/activities/EditActivitySheet";
import { supabase } from "@/integrations/supabase/client";
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
import { canActOnActivity, useMockUser } from "@/lib/mockUser";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();
  const currentUser = useMockUser();

  const [filter, setFilter] = useState<string>("all");

  const today = useMemo(() => new Date(), []);

  const nowMs = today.getTime();
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

    const list: OccurrenceView[] = [];
    for (const a of activities.data ?? []) {
      if (filter !== "all" && a.assigned_user_id !== filter) continue;
      const occ = buildOccurrence(a, today, compSet, reMap);
      if (occ && occ.status !== "fora") list.push(occ);
    }

    const bucket = (s: OccurrenceStatus) =>
      list.filter((o) => o.status === s).sort(sortOccurrences);

    return {
      atrasadas: bucket("atrasada"),
      hoje: bucket("hoje"),
      proximas: bucket("proxima"),
      concluidas: bucket("concluida"),
    };
  }, [activities.data, completions.data, reschedules.data, filter, today]);

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

  const impersonatedName =
    currentUser.role === "member" && currentUser.id !== "__member_unassigned__"
      ? memberById.get(currentUser.id)?.name
      : null;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="space-y-6 md:space-y-8">
        {/* HERO */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber">
              {format(today, "EEEE", { locale: ptBR })} ·{" "}
              {format(today, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-navy md:text-[32px]">
              Painel da rotina
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Atividades atrasadas, para hoje e próximas — atualizadas em tempo real.
            </p>
            {currentUser.role === "member" && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-navy/5 px-2.5 py-1 text-[11px] font-medium text-navy">
                <Eye className="h-3 w-3" />
                Modo membro
                {impersonatedName ? (
                  <span className="text-navy/70">· {impersonatedName}</span>
                ) : (
                  <span className="text-navy/70">· selecione um membro no topo</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
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
            <div className="hidden md:block">
              <NewActivitySheet
                trigger={
                  <Button className="h-10 gap-1.5 rounded-lg bg-[#185FA5] px-4 font-medium text-white hover:bg-[#042C53]">
                    <Plus className="h-4 w-4" />
                    Nova Atividade
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        {/* Mobile FAB */}
        <div className="fixed bottom-[88px] right-4 z-40 md:hidden">
          <NewActivitySheet
            trigger={
              <button
                type="button"
                aria-label="Nova atividade"
                className="grid h-14 w-14 place-items-center rounded-full bg-[#D85A30] text-white shadow-lg shadow-[#D85A30]/30 transition-transform active:scale-95 hover:bg-[#993C1D]"
              >
                <Plus className="h-6 w-6" />
              </button>
            }
          />
        </div>

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

        <div className="grid gap-5 lg:grid-cols-2">
          <Section
            title="Atrasadas"
            tone="danger"
            items={atrasadas}
            memberById={memberById}
            isLoading={isLoading}
            emptyIcon={CheckCircle}
            emptyIconClass="text-emerald-500"
            emptyTitle="Tudo em dia!"
            emptyMessage="Nenhuma atividade atrasada."
            currentUser={currentUser}
          />
          <Section
            title="Para hoje"
            tone="warning"
            items={hoje}
            memberById={memberById}
            isLoading={isLoading}
            emptyIcon={Coffee}
            emptyIconClass="text-[#185FA5]"
            emptyTitle="Dia tranquilo"
            emptyMessage="Você não tem atividades para hoje."
            currentUser={currentUser}
          />
          <Section
            title="Próximos 7 dias"
            tone="navy"
            items={proximas}
            memberById={memberById}
            isLoading={isLoading}
            emptyIcon={Calendar}
            emptyIconClass="text-gray-400"
            emptyTitle="Nada por aqui"
            emptyMessage="Nenhuma atividade neste período."
            currentUser={currentUser}
          />
          <Section
            title="Concluídas hoje"
            tone="success"
            items={concluidas}
            memberById={memberById}
            isLoading={isLoading}
            emptyIcon={Inbox}
            emptyIconClass="text-gray-400"
            emptyTitle="Nada por aqui"
            emptyMessage="Ainda nada concluído hoje."
            currentUser={currentUser}
            showCompletedStyle
          />
        </div>

      </div>
    </>
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
  currentUser: ReturnType<typeof useMockUser>;
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
  currentUser: ReturnType<typeof useMockUser>;
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
  currentUser: ReturnType<typeof useMockUser>;
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
        return "Única";
    }
  })();

  async function complete() {
    setBusy(true);
    const { error } = await supabase.from("completions").upsert(
      {
        activity_id: occ.activity.id,
        occurrence_key: occ.originalKey,
      },
      { onConflict: "activity_id,occurrence_key" },
    );
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
    openEdit("edit");
  }


  const dateLabel = format(occ.effectiveDate, "EEE, d MMM", { locale: ptBR });

  return (
    <li
      onPointerDown={handleCardPointerDown}
      onClick={handleCardClick}
      className={cn(
        "group flex cursor-pointer flex-col justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow duration-200 md:p-5 md:hover:shadow-md",
        completed && "bg-success/5",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityPill priority={occ.activity.priority} />
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

        {clientName && (
          <div className="mt-2 mb-1 truncate text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {clientName}
          </div>
        )}
        <h3
          className={cn(
            "mb-2 line-clamp-2 text-base font-semibold leading-tight text-[#042C53]",
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

      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-gray-500">
        {member?.name && (
          <span className="inline-flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {member.name}
            {member.role ? (
              <span className="text-gray-400">· {member.role}</span>
            ) : null}
          </span>
        )}
        {dateLabel && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {dateLabel}
          </span>
        )}
        {recurrenceDetail && (
          <span className="inline-flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            {recurrenceDetail}
          </span>
        )}
      </div>

      {canAct && (
        <div className="mt-4 flex gap-2 border-t border-gray-50 pt-3">
          {completed ? (
            <button
              type="button"
              onClick={reopen}
              disabled={busy}
              className="h-10 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Desfazer
            </button>
          ) : (
            <button
              type="button"
              onClick={complete}
              disabled={busy}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => openEdit("reschedule")}
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

function PriorityPill({ priority }: { priority: Priority }) {
  const cls = {
    alta: "bg-red-50 text-red-600",
    media: "bg-yellow-50 text-yellow-600",
    baixa: "bg-blue-50 text-[#185FA5]",
  }[priority];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <Flag className="h-3 w-3" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

