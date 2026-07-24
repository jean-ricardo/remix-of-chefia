import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, User as UserIcon, Calendar as CalendarIcon, RotateCw } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NewTaskModal } from "@/components/activities/NewTaskModal";
import { EditActivitySheet } from "@/components/activities/EditActivitySheet";
import {
  useActivities,
  useCompletions,
  useReschedules,
  useRotinaRealtime,
  useTeamMembers,
} from "@/lib/useRotina";
import {
  buildOccurrence,
  RECURRENCE_LABEL,
  WEEKDAY_LONG,
  type OccurrenceView,
  type TeamMember,
} from "@/lib/rotina";

export const Route = createFileRoute("/atividades")({
  component: AtividadesPage,
});

type StatusFilter = "all" | "pendentes" | "concluidas" | "atrasadas";
type RecurrenceFilter = "all" | "unica" | "diaria" | "semanal" | "mensal";

function AtividadesPage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recFilter, setRecFilter] = useState<RecurrenceFilter>("all");

  const [selected, setSelected] = useState<OccurrenceView | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const today = useMemo(() => new Date(), []);

  const memberById = useMemo(() => {
    const m = new Map<string, TeamMember>();
    (members.data ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [members.data]);

  // Derived rows — never mutate original activities array.
  const rows = useMemo(() => {
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
      const occ = buildOccurrence(a, today, compSet, reMap);
      if (occ) list.push(occ);
    }
    return list;
  }, [activities.data, completions.data, reschedules.data, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((occ) => {
      // Recurrence filter
      if (recFilter !== "all" && occ.activity.recurrence_type !== recFilter) return false;

      // Status filter
      if (statusFilter === "atrasadas" && occ.status !== "atrasada") return false;
      if (statusFilter === "concluidas" && occ.status !== "concluida") return false;
      if (
        statusFilter === "pendentes" &&
        !(occ.status === "hoje" || occ.status === "proxima" || occ.status === "atrasada") 
      )
        return false;
      if (statusFilter === "pendentes" && occ.status === "concluida") return false;

      // Text search: title + assignee name
      if (q) {
        const assignee = occ.activity.assigned_user_id
          ? memberById.get(occ.activity.assigned_user_id)?.name ?? ""
          : "";
        const hay = `${occ.activity.title} ${assignee}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, statusFilter, recFilter, memberById]);

  function openRow(occ: OccurrenceView) {
    setSelected(occ);
    setEditOpen(true);
  }

  const isLoading =
    activities.isLoading || completions.isLoading || reschedules.isLoading || members.isLoading;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="space-y-6">
        {/* HEADER */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D85A30]">
              Atividades
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold tracking-tight text-[#042C53] md:text-[32px]">
              Command Center
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Histórico completo — busque, filtre e edite qualquer atividade da equipe.
            </p>
          </div>
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

        {/* COMMAND BAR */}
        <div className="flex flex-col items-stretch gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no histórico..."
              className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-[#042C53] placeholder:text-muted-foreground/70 focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-white sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: Todas</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="concluidas">Concluídas</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={recFilter} onValueChange={(v) => setRecFilter(v as RecurrenceFilter)}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-white sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Recorrência: Todas</SelectItem>
                <SelectItem value="unica">Única</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-white p-8 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
            Nenhuma atividade encontrada com os filtros atuais.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((occ) => (
              <HistoryRow
                key={`${occ.activity.id}-${occ.originalKey}`}
                occ={occ}
                memberById={memberById}
                onOpen={() => openRow(occ)}
              />
            ))}
          </ul>
        )}
      </div>

      <EditActivitySheet
        open={editOpen}
        onOpenChange={setEditOpen}
        occurrence={selected}
        mode="edit"
      />
    </>
  );
}

function HistoryRow({
  occ,
  memberById,
  onOpen,
}: {
  occ: OccurrenceView;
  memberById: Map<string, TeamMember>;
  onOpen: () => void;
}) {
  const member = occ.activity.assigned_user_id
    ? memberById.get(occ.activity.assigned_user_id)
    : null;

  const statusMeta = (() => {
    switch (occ.status) {
      case "atrasada":
        return { dot: "bg-danger", label: "Atrasada", chip: "bg-danger/10 text-danger" };
      case "hoje":
        return { dot: "bg-amber", label: "Hoje", chip: "bg-amber/20 text-amber-foreground" };
      case "proxima":
        return { dot: "bg-[#185FA5]", label: "Próxima", chip: "bg-[#185FA5]/10 text-[#185FA5]" };
      case "concluida":
        return { dot: "bg-success", label: "Concluída", chip: "bg-success/10 text-success" };
      default:
        return { dot: "bg-muted-foreground", label: "—", chip: "bg-muted text-muted-foreground" };
    }
  })();

  const recurrenceLabel = (() => {
    const a = occ.activity;
    switch (a.recurrence_type) {
      case "diaria":
        return "Diária";
      case "semanal":
        return a.weekday != null ? `Semanal · ${WEEKDAY_LONG[a.weekday]}` : "Semanal";
      case "mensal":
        return a.month_day != null ? `Mensal · dia ${a.month_day}` : "Mensal";
      case "unica":
        return "Única";
      default:
        return RECURRENCE_LABEL[a.recurrence_type];
    }
  })();

  const dateLabel = format(occ.effectiveDate, "d MMM yyyy", { locale: ptBR });

  return (
    <li
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-xl border border-border/60 bg-white p-4 shadow-sm transition-all",
        "hover:border-[#185FA5]/40 hover:shadow-md",
        "flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-4",
      )}
    >
      {/* LEFT: dot + title + badges */}
      <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
        <span
          className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full md:mt-0", statusMeta.dot)}
          aria-label={statusMeta.label}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-[#042C53]">{occ.activity.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                statusMeta.chip,
              )}
            >
              {statusMeta.label}
            </span>
            <span className="inline-flex rounded-full border border-border bg-[#F7F6F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#042C53]/70">
              {recurrenceLabel}
            </span>
            {occ.isRescheduled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#185FA5]/25 bg-[#185FA5]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#185FA5]">
                <RotateCw className="h-3 w-3" />
                Reprogramada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT (desktop): badges + assignee + date */}
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        {occ.isRescheduled && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#185FA5]/25 bg-[#185FA5]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#185FA5]">
            <RotateCw className="h-3 w-3" />
            Reprogramada
          </span>
        )}
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            statusMeta.chip,
          )}
        >
          {statusMeta.label}
        </span>
        <span className="inline-flex rounded-full border border-border bg-[#F7F6F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#042C53]/70">
          {recurrenceLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#042C53]/70">
          <UserIcon className="h-3.5 w-3.5" />
          {member?.name ?? "Sem responsável"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#042C53]">
          <CalendarIcon className="h-3.5 w-3.5" />
          {dateLabel}
        </span>
      </div>

      {/* Mobile meta row */}
      <div className="flex w-full items-center justify-between gap-3 text-xs text-[#042C53]/70 md:hidden">
        <span className="inline-flex items-center gap-1.5 truncate">
          <UserIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{member?.name ?? "Sem responsável"}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 font-medium text-[#042C53]">
          <CalendarIcon className="h-3.5 w-3.5" />
          {dateLabel}
        </span>
      </div>
    </li>
  );
}
