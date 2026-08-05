import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  useActivities,
  useCompletions,
  useReschedules,
  useRotinaRealtime,
  useTeamMembers,
} from "@/lib/useRotina";
import {
  buildOccurrence,
  sortOccurrences,
  type OccurrenceView,
} from "@/lib/rotina";
import { useCurrentUser, hasGlobalScope } from "@/lib/auth";
import { TaskDetailsSheet } from "@/components/activities/TaskDetailsSheet";
import { OccurrenceCard } from "@/components/activities/OccurrenceCard";

export const Route = createFileRoute("/atrasadas")({
  component: AtrasadasPage,
});

function AtrasadasPage() {
  useRotinaRealtime();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();
  const members = useTeamMembers();
  const currentUser = useCurrentUser();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const isAdmin = hasGlobalScope(currentUser.role);
  const effectiveUserId = !isAdmin && currentUser.id ? currentUser.id : null;

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
    const m = new Map();
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
      <header className="mb-8">
        <div className="flex items-center gap-2 text-danger">
          <AlertCircle className="h-6 w-6" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy md:text-3xl">
            Atividades Atrasadas
          </h1>
        </div>
        <p className="mt-2 text-muted-foreground">
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
              member={memberById.get(occ.activity.assigned_user_id || (occ.activity as any).assignee_id)}
              onOpenDetails={() => setDetailsTaskId(occ.activity.id)}
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
