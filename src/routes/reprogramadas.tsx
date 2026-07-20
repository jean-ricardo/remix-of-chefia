import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, RotateCw, User as UserIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useActivities,
  useReschedules,
  useRotinaRealtime,
  useTeamMembers,
} from "@/lib/useRotina";
import type { Activity, TeamMember } from "@/lib/rotina";

export const Route = createFileRoute("/reprogramadas")({
  component: ReprogramadasPage,
});

function ReprogramadasPage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();
  const reschedules = useReschedules();

  const [filter, setFilter] = useState<string>("all");

  const activityById = useMemo(() => {
    const m = new Map<string, Activity>();
    (activities.data ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [activities.data]);

  const memberById = useMemo(() => {
    const m = new Map<string, TeamMember>();
    (members.data ?? []).forEach((x) => m.set(x.id, x));
    return m;
  }, [members.data]);

  const rows = useMemo(() => {
    const list = (reschedules.data ?? [])
      .map((r) => {
        const activity = activityById.get(r.activity_id);
        if (!activity) return null;
        if (filter !== "all" && activity.assigned_user_id !== filter) return null;
        return { ...r, activity };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    // Sort by new_date desc
    list.sort((a, b) => (a.new_date < b.new_date ? 1 : -1));
    return list;
  }, [reschedules.data, activityById, filter]);

  const isLoading = activities.isLoading || reschedules.isLoading || members.isLoading;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">
            Histórico
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy md:text-4xl">
            Atividades reprogramadas
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Todas as ocorrências com nova data e a justificativa registrada.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Responsável</label>
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

      {isLoading ? (
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma reprogramação registrada.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const member = r.activity.assigned_user_id
              ? memberById.get(r.activity.assigned_user_id)
              : null;
            const originalDate = parseISO(r.original_occurrence_key);
            const newDate = parseISO(r.new_date);
            return (
              <li
                key={`${r.activity_id}-${r.original_occurrence_key}`}
                className="rounded-xl border border-navy/20 bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-navy/25 bg-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
                    <RotateCw className="h-3 w-3" />
                    Reprogramada
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-navy">
                  {r.activity.title}
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
                    De {format(originalDate, "d MMM yyyy", { locale: ptBR })} →{" "}
                    <strong className="text-navy">
                      {format(newDate, "d MMM yyyy", { locale: ptBR })}
                    </strong>
                  </span>
                </div>
                <div className="mt-3 rounded-md border border-navy/20 bg-navy/5 p-2 text-xs text-navy">
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-navy/80">
                    <RotateCw className="h-3 w-3" />
                    Justificativa
                  </div>
                  <p className="whitespace-pre-wrap text-navy/90">
                    {r.justification || "(sem justificativa)"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
