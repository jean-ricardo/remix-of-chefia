import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Plus,
  RotateCw,
  User as UserIcon,
} from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ymd,
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

        {/* STAT CARDS: mobile horizontal scroll / desktop grid */}
        <div className="-mx-4 overflow-x-auto scrollbar-hide px-4 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex min-w-max gap-3 md:grid md:min-w-0 md:grid-cols-4">
            <StatCard
              label="Atrasadas"
              count={atrasadas.length}
              tone="danger"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <StatCard
              label="Para hoje"
              count={hoje.length}
              tone="warning"
              icon={<Clock className="h-4 w-4" />}
            />
            <StatCard
              label="Próx. 7 dias"
              count={proximas.length}
              tone="navy"
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatCard
              label="Concluídas hoje"
              count={concluidas.length}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <Section
              title="Atrasadas"
              tone="danger"
              items={atrasadas}
              memberById={memberById}
              emptyText="Nada em atraso. Ótimo trabalho."
              currentUser={currentUser}
            />
            <Section
              title="Para hoje"
              tone="warning"
              items={hoje}
              memberById={memberById}
              emptyText="Nenhuma atividade para hoje."
              currentUser={currentUser}
            />
            <Section
              title="Próximos 7 dias"
              tone="navy"
              items={proximas}
              memberById={memberById}
              emptyText="Sem atividades na próxima semana."
              currentUser={currentUser}
            />
            <Section
              title="Concluídas hoje"
              tone="success"
              items={concluidas}
              memberById={memberById}
              emptyText="Ainda nada concluído hoje."
              currentUser={currentUser}
              showCompletedStyle
            />
          </div>
        )}
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
  const toneClass = {
    danger: "border-danger/20 text-danger",
    warning: "border-amber/40 text-amber-foreground",
    navy: "border-navy/20 text-navy",
    success: "border-success/25 text-success",
  }[tone];
  const chipClass = {
    danger: "bg-danger/10",
    warning: "bg-amber/20",
    navy: "bg-navy/10",
    success: "bg-success/10",
  }[tone];
  return (
    <div
      className={cn(
        "min-w-[160px] snap-start rounded-2xl border bg-card p-4 shadow-sm transition-shadow md:min-w-0 md:hover:shadow-md",
        toneClass,
      )}
    >
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("grid h-7 w-7 place-items-center rounded-full", chipClass)}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums text-navy">{count}</div>
    </div>
  );
}

function Section({
  title,
  tone,
  items,
  memberById,
  emptyText,
  showCompletedStyle,
  currentUser,
}: {
  title: string;
  tone: "danger" | "warning" | "navy" | "success";
  items: OccurrenceView[];
  memberById: Map<string, TeamMember>;
  emptyText: string;
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
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((occ) => (
            <OccurrenceCard
              key={`${occ.activity.id}-${occ.originalKey}`}
              occ={occ}
              memberById={memberById}
              completed={!!showCompletedStyle}
              currentUser={currentUser}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function priorityChip(p: Priority) {
  const cls = {
    alta: "bg-danger/10 text-danger border-danger/25",
    media: "bg-amber/25 text-amber-foreground border-amber/40",
    baixa: "bg-navy/8 text-navy border-navy/20",
  }[p];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      <Flag className="h-3 w-3" />
      {PRIORITY_LABEL[p]}
    </span>
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

  const borderTone = completed
    ? "border-success/25"
    : occ.status === "atrasada"
      ? "border-danger/25"
      : occ.status === "hoje"
        ? "border-amber/40"
        : "border-border/60";

  return (
    <li
      className={cn(
        "group rounded-2xl border bg-card p-3.5 shadow-sm transition-all md:p-4 md:hover:shadow-md md:hover:border-navy/25",
        borderTone,
        completed && "bg-success/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {priorityChip(occ.activity.priority)}
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
            <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {clientName}
            </div>
          )}
          <h3
            className={cn(
              "mt-1 text-[15px] font-semibold leading-snug text-navy md:text-base",
              completed && "line-through text-muted-foreground",
            )}
          >
            {occ.activity.title}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground md:text-xs">
            <span className="inline-flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {member?.name ?? "Sem responsável"}
              {member?.role ? (
                <span className="text-muted-foreground/70">· {member.role}</span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {dateLabel}
            </span>
            <span>{recurrenceDetail}</span>
          </div>

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
      </div>

      {canAct && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {completed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={reopen}
              disabled={busy}
              className="h-11 min-w-[44px] md:h-9"
            >
              Desfazer
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={complete}
              disabled={busy}
              className="h-11 min-w-[44px] bg-success text-success-foreground hover:bg-success/90 md:h-9"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="h-11 min-w-[44px] md:h-9"
            onClick={openRescheduleDialog}
          >
            <RotateCw className="h-4 w-4" />
            Reprogramar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Reprogramar atividade</DialogTitle>
                <DialogDescription>
                  Escolha a nova data e descreva o motivo da reprogramação.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nova data
                  </Label>
                  <div className="rounded-md border">
                    <Calendar
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={setRescheduleDate}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="justification"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Justificativa <span className="text-danger">*</span>
                  </Label>
                  <Textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explique por que a atividade precisa ser reprogramada…"
                    rows={4}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={reschedule}
                  disabled={busy || !rescheduleDate || justification.trim().length < 3}
                >
                  Confirmar reprogramação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </li>
  );
}
