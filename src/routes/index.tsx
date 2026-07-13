import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flag,
  RotateCw,
  User as UserIcon,
} from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  RECURRENCE_LABEL,
  sortOccurrences,
  WEEKDAY_LONG,
  ymd,
  type OccurrenceStatus,
  type OccurrenceView,
  type Priority,
  type TeamMember,
} from "@/lib/rotina";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();

  const [filter, setFilter] = useState<string>("all");

  const today = useMemo(() => new Date(), []);

  const { atrasadas, hoje, proximas, concluidas } = useMemo(() => {
    const compSet = new Set(
      (completions.data ?? []).map((c) => `${c.activity_id}|${c.occurrence_key}`),
    );
    const reMap = new Map(
      (reschedules.data ?? []).map((r) => [
        `${r.activity_id}|${r.original_occurrence_key}`,
        r.new_date,
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

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">
              {format(today, "EEEE", { locale: ptBR })} · {format(today, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-navy md:text-4xl">
              Painel da rotina
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Atividades atrasadas, para hoje e próximas — atualizadas em tempo real.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Visualizar
            </label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[240px] bg-card">
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
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Atrasadas"
              tone="danger"
              items={atrasadas}
              memberById={memberById}
              emptyText="Nada em atraso. Ótimo trabalho."
            />
            <Section
              title="Para hoje"
              tone="warning"
              items={hoje}
              memberById={memberById}
              emptyText="Nenhuma atividade para hoje."
            />
            <Section
              title="Próximos 7 dias"
              tone="navy"
              items={proximas}
              memberById={memberById}
              emptyText="Sem atividades na próxima semana."
            />
            <Section
              title="Concluídas hoje"
              tone="success"
              items={concluidas}
              memberById={memberById}
              emptyText="Ainda nada concluído hoje."
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
    danger: "bg-danger/10 text-danger border-danger/30",
    warning: "bg-amber/15 text-amber-foreground border-amber/40",
    navy: "bg-navy/8 text-navy border-navy/25",
    success: "bg-success/10 text-success border-success/30",
  }[tone];
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", toneClass)}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{count}</div>
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
}: {
  title: string;
  tone: "danger" | "warning" | "navy" | "success";
  items: OccurrenceView[];
  memberById: Map<string, TeamMember>;
  emptyText: string;
  showCompletedStyle?: boolean;
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
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
        <span className="ml-auto text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((occ) => (
            <OccurrenceCard
              key={`${occ.activity.id}-${occ.originalKey}`}
              occ={occ}
              memberById={memberById}
              completed={!!showCompletedStyle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function priorityChip(p: Priority) {
  const cls = {
    alta: "bg-danger/12 text-danger border-danger/30",
    media: "bg-amber/20 text-amber-foreground border-amber/40",
    baixa: "bg-navy/10 text-navy border-navy/25",
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
}: {
  occ: OccurrenceView;
  memberById: Map<string, TeamMember>;
  completed: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const member = occ.activity.assigned_user_id
    ? memberById.get(occ.activity.assigned_user_id)
    : null;

  const recurrenceDetail = (() => {
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

  async function reschedule(newDate: Date) {
    setBusy(true);
    setPickerOpen(false);
    const newDateStr = ymd(newDate);
    if (occ.activity.recurrence_type === "unica") {
      const { error } = await supabase
        .from("activities")
        .update({ due_date: newDateStr })
        .eq("id", occ.activity.id);
      setBusy(false);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Atividade reprogramada");
      return;
    }
    const { error } = await supabase.from("reschedules").upsert(
      {
        activity_id: occ.activity.id,
        original_occurrence_key: occ.originalKey,
        new_date: newDateStr,
      },
      { onConflict: "activity_id,original_occurrence_key" },
    );
    setBusy(false);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Ocorrência reprogramada");
  }

  const dateLabel = format(occ.effectiveDate, "EEE, d MMM", { locale: ptBR });

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-colors",
        completed
          ? "border-success/30 bg-success/5"
          : occ.status === "atrasada"
            ? "border-danger/25"
            : occ.status === "hoje"
              ? "border-amber/40"
              : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {priorityChip(occ.activity.priority)}
            {occ.isRescheduled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-navy/25 bg-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
                <RotateCw className="h-3 w-3" />
                Reprogramada
              </span>
            )}
          </div>
          <h3
            className={cn(
              "mt-1.5 text-base font-semibold text-navy",
              completed && "line-through text-muted-foreground",
            )}
          >
            {occ.activity.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {completed ? (
          <Button
            size="sm"
            variant="outline"
            onClick={reopen}
            disabled={busy}
            className="h-8"
          >
            Desfazer
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={complete}
            disabled={busy}
            className="h-8 bg-success text-success-foreground hover:bg-success/90"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir
          </Button>
        )}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="h-8"
            >
              <RotateCw className="h-4 w-4" />
              Reprogramar
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={occ.effectiveDate}
              onSelect={(d) => d && reschedule(d)}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </li>
  );
}
