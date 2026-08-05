import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, RotateCw, User as UserIcon, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Activity, TeamMember } from "@/lib/rotina";

export const Route = createFileRoute("/reprogramadas")({
  component: ReprogramadasPage,
});

function ReprogramadasPage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();
  const reschedules = useReschedules();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    // Sort by created_at DESC (Mais recentes no topo absoluto)
    list.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    return list;
  }, [reschedules.data, activityById, filter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("reschedules")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success("Registros excluídos com sucesso.");
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["reschedules"] });
    } catch (err: any) {
      console.error("Erro ao excluir reprogramações:", err);
      toast.error("Erro ao excluir registros.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

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
        <div className="flex flex-wrap items-end gap-3">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="h-10 gap-2 shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Excluir ({selectedIds.length}) selecionados
            </Button>
          )}
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
        </div>
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-navy/10 bg-white p-3 shadow-sm">
        <Checkbox
          id="select-all"
          checked={rows.length > 0 && selectedIds.length === rows.length}
          onCheckedChange={toggleSelectAll}
        />
        <label
          htmlFor="select-all"
          className="cursor-pointer text-xs font-medium text-navy"
        >
          Selecionar Todos
        </label>
      </div>

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
                key={r.id}
                className={cn(
                  "relative flex gap-3 rounded-xl border p-4 shadow-sm transition-all",
                  selectedIds.includes(r.id)
                    ? "border-navy bg-navy/5"
                    : "border-navy/20 bg-card",
                )}
              >
                <div className="pt-1">
                  <Checkbox
                    checked={selectedIds.includes(r.id)}
                    onCheckedChange={() => toggleSelect(r.id)}
                  />
                </div>
                <div className="flex-1">
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
              </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registros selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar permanentemente estes registros?
              Esta ação não pode ser desfeita e os dados serão removidos do
              sistema.
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
    </div>
  );
}
