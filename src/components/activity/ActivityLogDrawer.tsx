import { X, History as HistoryIcon } from "lucide-react";
import {
  ACTION_LABEL,
  useActivityLogs,
  useActivityLogsRealtime,
} from "@/lib/activityLog";
import { cn } from "@/lib/utils";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ActivityLogDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useActivityLogsRealtime(open);
  const { data, isLoading } = useActivityLogs(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Histórico de ações"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl",
          "sm:w-[420px]",
        )}
      >
        <header className="flex items-center gap-2 border-b border-[#042C53]/10 px-4 py-4">
          <HistoryIcon className="h-5 w-5 text-[#185FA5]" />
          <h2 className="text-base font-semibold text-[#042C53]">Histórico de ações</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar histórico"
            className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-[#042C53]/70 transition-colors hover:bg-[#042C53]/5"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-[#042C53]/5" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[#444441]">
              Nenhuma ação registrada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-[#042C53]/10 bg-[#F7F6F2] px-3 py-2.5"
                >
                  <p className="text-sm text-[#042C53]">
                    <span className="font-semibold">{log.actor_name}</span>{" "}
                    {ACTION_LABEL[log.action_type] ?? log.action_type}
                  </p>
                  {log.details ? (
                    <p className="mt-0.5 text-sm text-[#444441]">{log.details}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] font-medium text-[#444441]/70">
                    {formatWhen(log.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

export default ActivityLogDrawer;
