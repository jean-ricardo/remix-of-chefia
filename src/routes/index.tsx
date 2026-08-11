import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  LayoutDashboard,
  Loader2,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useActivities, useCompletions, useReschedules, useTeamMembers, useRotinaRealtime } from "@/lib/useRotina";
import { ProtectedRoute } from "@/components/auth/RouteGuards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isPast, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { taskId } = useSearch({ from: "/" }) as { taskId?: string };

  const { data: activities = [], isLoading: loadingActivities } = useActivities();
  const { data: completions = [], isLoading: loadingCompletions } = useCompletions();
  const { data: reschedules = [], isLoading: loadingReschedules } = useReschedules();
  const { data: members = [] } = useTeamMembers();
  useRotinaRealtime();

  const isMaster = user?.role === "master";

  // Filter activities based on role
  const filteredActivities = isMaster
    ? activities
    : activities.filter((a) => a.assigned_user_id === user?.id);

  const todayCompletions = completions.filter((c) =>
    isToday(new Date(c.completed_at)),
  );

  const stats = {
    total: filteredActivities.length,
    completedToday: todayCompletions.length,
    pending: filteredActivities.length - todayCompletions.length,
    members: members.length,
  };

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#042C53]">Olá, {user?.name}</h1>
            <p className="text-muted-foreground">
              {isMaster
                ? "Aqui está o resumo da rotina da sua equipe hoje."
                : "Aqui estão suas tarefas pendentes para hoje."}
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: "/atividades" })}
            className="bg-[#185FA5] hover:bg-[#042C53]"
          >
            Ver Todas as Tarefas
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Tarefas"
            value={stats.total}
            icon={CalendarDays}
            description="Cadastradas no sistema"
          />
          <StatCard
            title="Concluídas Hoje"
            value={stats.completedToday}
            icon={CheckCircle2}
            description="Tarefas finalizadas"
          />
          <StatCard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
            description="Aguardando conclusão"
          />
          {isMaster && (
            <StatCard
              title="Equipe"
              value={stats.members}
              icon={Users}
              description="Membros ativos"
            />
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold text-[#042C53]">
                Tarefas de Hoje
              </CardTitle>
              <Badge variant="outline" className="font-semibold uppercase tracking-wider">
                {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingActivities ? (
                  <div className="flex py-8 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma tarefa agendada para hoje.
                  </p>
                ) : (
                  filteredActivities.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50/50"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-[#042C53]">{activity.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {activity.priority} • {activity.recurrence_type}
                        </p>
                      </div>
                      <Badge
                        variant={
                          todayCompletions.some((c) => c.activity_id === activity.id)
                            ? "default"
                            : "secondary"
                        }
                      >
                        {todayCompletions.some((c) => c.activity_id === activity.id)
                          ? "Concluída"
                          : "Pendente"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#042C53]">
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loadingCompletions ? (
                  <div className="flex py-8 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : todayCompletions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma atividade recente registrada.
                  </p>
                ) : (
                  todayCompletions.slice(0, 5).map((completion) => {
                    const activity = activities.find(
                      (a) => a.id === completion.activity_id,
                    );
                    return (
                      <div key={completion.activity_id + completion.completed_at} className="relative flex gap-4 pb-6 last:pb-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-[#042C53]">
                            {activity?.title || "Tarefa concluída"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Concluída às {format(new Date(completion.completed_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  icon: any;
  description: string;
}) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-[#185FA5]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[#042C53]">{value}</div>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
