import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, User as UserIcon, Calendar as CalendarIcon, RotateCw, Trash2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { hasGlobalScope, useCurrentUser } from "@/lib/auth";
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
  const qc = useQueryClient();
  const members = useTeamMembers();
  const user = useCurrentUser();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recFilter, setRecFilter] = useState<RecurrenceFilter>("all");

  const [selected, setSelected] = useState<OccurrenceView | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    
    // Sort logic: most recent first (descending by effectiveDate)
    const sorted = [...rows].sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());

    return sorted.filter((occ) => {
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

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const activity = activities.data?.find((a) => a.id === deleteId);
      
      // Otimistic Update: remove from local cache immediately
      qc.setQueryData(["activities", user.team_id], (old: any) => 
        (old ?? []).filter((a: any) => a.id !== deleteId)
      );

      const { error } = await supabase.from("activities").delete().eq("id", deleteId);
      if (error) throw error;

      await logActivity({
        actorName: user.name,
        actionType: "delete",
        details: `Excluiu permanentemente a atividade "${activity?.title || deleteId}".`,
        teamId: user.team_id,
      });

      toast.success("Atividade excluída com sucesso.");
      
      // Invalidate to sync with server
      await qc.invalidateQueries({ queryKey: ["activities", user.team_id] });
      await qc.invalidateQueries({ queryKey: ["activities"] });
    } catch (err) {
      // Rollback if error
      await qc.invalidateQueries({ queryKey: ["activities", user.team_id] });
      console.error("Erro ao excluir atividade:", err);
      toast.error("Erro ao excluir a atividade.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  const isLoading =
    activities.isLoading || completions.isLoading || reschedules.isLoading || members.isLoading;

  return (
    <>
      <Toaster richColors />
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
            <Button
              onClick={() => setNewTaskOpen(true)}
              className="h-10 gap-1.5 rounded-lg bg-[#185FA5] px-4 font-medium text-white hover:bg-[#042C53]"
            >
              <Plus className="h-4 w-4" />
              Nova Atividade
            </Button>
          </div>
        </header>

        {/* Mobile FAB */}
        <div className="fixed bottom-[88px] right-4 z-40 md:hidden">
          <button
            type="button"
            onClick={() => setNewTaskOpen(true)}
            aria-label="Nova atividade"
            className="grid h-14 w-14 place-items-center rounded-full bg-[#D85A30] text-white shadow-lg shadow-[#D85A30]/30 transition-transform active:scale-95 hover:bg-[#993C1D]"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        <NewTaskModal isOpen={newTaskOpen} onClose={() => setNewTaskOpen(false)} />


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
                onDelete={hasGlobalScope(user.role) ? () => setDeleteId(occ.activity.id) : undefined}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar permanentemente esta atividade? Esta ação removerá a tarefa e todas as suas ocorrências futuras. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function HistoryRow({
  occ,
  memberById,
  onOpen,
  onDelete,
}: {
  occ: OccurrenceView;
  memberById: Map<string, TeamMember>;
  onOpen: () => void;
  onDelete?: () => void;
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
      className={cn(
        "group relative rounded-xl border border-border/60 bg-white p-4 shadow-sm transition-all",
        "hover:border-[#185FA5]/40 hover:shadow-md",
        "flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-4",
      )}
    >
      <div 
        onClick={onOpen}
        className="absolute inset-0 z-0 cursor-pointer"
      />
      
      {/* LEFT: dot + title + badges */}
      <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3 md:items-center">
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
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="relative z-20 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Excluir atividade"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
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
