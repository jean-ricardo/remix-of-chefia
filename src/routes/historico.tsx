import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";

import {
  ACTION_LABEL,
  useActivityLogs,
  useActivityLogsRealtime,
  type ActivityLog,
} from "@/lib/activityLog";
import { hasGlobalScope, useAuth, useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
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

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Ações — Chef.IA" },
      {
        name: "description",
        content:
          "Auditoria completa das ações da equipe: criação, edição, conclusão e reprogramação de atividades em tempo real.",
      },
      { property: "og:title", content: "Histórico de Ações — Chef.IA" },
      {
        property: "og:description",
        content:
          "Auditoria completa das ações da equipe em tempo real na plataforma Chef.IA.",
      },
    ],
  }),
  component: HistoricoPage,
});

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const ACTION_TONE: Record<string, string> = {
  create: "bg-[#185FA5]/10 text-[#185FA5]",
  update: "bg-amber-500/15 text-amber-700",
  delete: "bg-[#D85A30]/10 text-[#D85A30]",
  status: "bg-emerald-500/10 text-emerald-700",
  reschedule: "bg-[#042C53]/10 text-[#042C53]",
};

function HistoricoPage() {
  const { loading } = useAuth();
  const user = useCurrentUser();
  const allowed = hasGlobalScope(user.role);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || allowed) return;
    toast.error("Acesso restrito à diretoria e administradores.");
    navigate({ to: "/", replace: true });
  }, [loading, allowed, navigate]);

  useActivityLogsRealtime(allowed);
  const { data, isLoading } = useActivityLogs(allowed);
  const qc = useQueryClient();

  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [term, setTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const logs: ActivityLog[] = useMemo(() => data ?? [], [data]);

  const actors = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actor_name).filter(Boolean))).sort(),
    [logs],
  );
  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action_type).filter(Boolean))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return logs
      .filter((l) => (actor === "all" ? true : l.actor_name === actor))
      .filter((l) => (action === "all" ? true : l.action_type === action))
      .filter((l) =>
        q
          ? `${l.actor_name} ${l.details} ${ACTION_LABEL[l.action_type] ?? l.action_type}`
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [logs, actor, action, term]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((l) => l.id));
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
        .from("activity_logs")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success("Registros excluídos com sucesso.");
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
    } catch (err: any) {
      console.error("Erro ao excluir logs:", err);
      toast.error("Erro ao excluir registros.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#042C53]/10 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-[#042C53]">Acesso restrito</h1>
        <p className="mt-2 text-sm text-[#444441]">
          O histórico de ações está disponível apenas para diretores e administradores.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#185FA5] px-4 text-sm font-medium text-white"
        >
          Voltar ao painel
        </Link>
      </div>
    );
  }

  const selectClass =
    "h-11 w-full rounded-lg border border-[#042C53]/15 bg-white px-3 text-sm text-[#042C53] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 sm:w-auto";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">
            Auditoria
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-bold text-navy sm:text-3xl">
              Histórico de Ações
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Auditoria em tempo real das atividades da equipe
          </p>
        </div>

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
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#042C53]/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#042C53]/10 bg-[#042C53]/5 px-3 py-2">
            <Checkbox
              id="select-all"
              checked={
                filtered.length > 0 && selectedIds.length === filtered.length
              }
              onCheckedChange={toggleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="cursor-pointer text-xs font-medium text-[#042C53]"
            >
              Selecionar Todos
            </label>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444441]/60" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por atividade ou responsável"
              className="h-11 w-full rounded-lg border border-[#042C53]/15 bg-white pl-9 pr-3 text-sm text-[#042C53] placeholder:text-[#444441]/60 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            aria-label="Filtrar por membro"
            className={selectClass}
          >
            <option value="all">Todos os membros</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filtrar por tipo de ação"
            className={selectClass}
          >
            <option value="all">Todas as ações</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a] ?? a}
              </option>
            ))}
          </select>
          <span className="shrink-0 rounded-lg bg-[#042C53]/5 px-3 py-1.5 text-center text-xs font-semibold text-[#042C53]">
            {filtered.length} registro{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-[#042C53]/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#042C53]/20 bg-white p-10 text-center">
          <p className="text-sm text-[#444441]">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((log) => (
            <li
              key={log.id}
              className={cn(
                "group relative rounded-xl border transition-all hover:shadow-sm",
                selectedIds.includes(log.id)
                  ? "border-[#185FA5] bg-[#185FA5]/5"
                  : "border-[#042C53]/10 bg-white",
              )}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="pt-1">
                  <Checkbox
                    checked={selectedIds.includes(log.id)}
                    onCheckedChange={() => toggleSelect(log.id)}
                  />
                </div>
                <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#042C53]">
                    <span className="font-semibold">{log.actor_name}</span>{" "}
                    <span
                      className={cn(
                        "ml-1 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        ACTION_TONE[log.action_type] ?? "bg-[#042C53]/5 text-[#042C53]",
                      )}
                    >
                      {ACTION_LABEL[log.action_type] ?? log.action_type}
                    </span>
                  </p>
                  {log.details ? (
                    <p className="mt-1 text-sm text-[#444441]">{log.details}</p>
                  ) : null}
                </div>
                <time className="shrink-0 text-[11px] font-medium text-[#444441]/70">
                  {formatWhen(log.created_at)}
                </time>
              </div>
            </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registros selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar permanentemente estes registros do
              histórico? Esta ação não pode ser desfeita e os dados serão
              removidos do sistema.
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

export default HistoricoPage;
