import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ScrollText, Search } from "lucide-react";

import {
  ACTION_LABEL,
  useActivityLogs,
  useActivityLogsRealtime,
  type ActivityLog,
} from "@/lib/activityLog";
import { hasGlobalScope, useAuth, useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [term, setTerm] = useState("");

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
    <div className="space-y-5">
      <div>
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#042C53]/15 bg-white px-3 text-sm font-medium text-[#042C53] transition-colors hover:bg-[#042C53]/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Painel
        </Link>
      </div>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#185FA5]/10 text-[#185FA5]">
            <ScrollText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-[#042C53] sm:text-2xl">
              Histórico de Ações
            </h1>
            <p className="truncate text-sm text-[#444441]">
              Auditoria em tempo real das atividades da equipe
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-[#042C53]/5 px-3 py-1.5 text-xs font-semibold text-[#042C53]">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl border border-[#042C53]/10 bg-white p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#444441]/60" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por atividade ou responsável"
            className="h-11 w-full rounded-lg border border-[#042C53]/15 bg-white pl-9 pr-3 text-sm text-[#042C53] placeholder:text-[#444441]/60 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
          />
        </div>
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
              className="rounded-xl border border-[#042C53]/10 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default HistoricoPage;
