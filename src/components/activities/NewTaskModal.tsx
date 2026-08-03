import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useTeamMembers } from "@/lib/useRotina";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppNotification } from "@/lib/whatsapp-notify.functions";
import { logActivity } from "@/lib/activityLog";
import { useCurrentUser } from "@/lib/auth";
import { formatDateBR, platformLink, resolveMemberWhatsApp } from "@/lib/taskNotify";
import { RECURRENCE_OPTIONS, type Recurrence } from "@/lib/recurrence";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}


const INITIAL = {
  title: "",
  priority: "media" as "alta" | "media" | "baixa",
  assignee: "",
  startDate: "",
  dueDate: "",
  description: "",
  recurrence: "none" as Recurrence,
};

export function NewTaskModal({ isOpen, onClose }: Props) {
  const members = useTeamMembers();
  const notify = useServerFn(sendWhatsAppNotification);
  const currentUser = useCurrentUser();

  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof INITIAL>(key: K, value: (typeof INITIAL)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleClose() {
    setForm(INITIAL);
    setSubmitting(false);
    onClose();
  }

  // Lock background scroll while modal is open
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Informe o título da atividade");
      return;
    }
    if (!form.assignee) {
      toast.error("Selecione um responsável");
      return;
    }

    setSubmitting(true);

    const effectiveDate =
      form.dueDate || form.startDate || new Date().toISOString().slice(0, 10);

    // Payload strictly mapped to the current DB schema — unmapped premium
    // UX fields (startDate, description) are intentionally NOT sent.
    const { data: inserted, error } = await supabase
      .from("activities")
      .insert({
        title: form.title.trim(),
        assigned_user_id: form.assignee,
        priority: form.priority,
        recurrence_type: "unica",
        due_date: effectiveDate,
        recurrence: form.recurrence,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[activities] insert failed", error);
      toast.error("Não foi possível criar a atividade");
      setSubmitting(false);
      return;
    }

    // Silent audit trail.
    void logActivity({
      actorName: currentUser.name,
      actionType: "create",
      details: `Criou a atividade "${form.title.trim()}" com vencimento em ${formatDateBR(effectiveDate)}.`,
      taskId: inserted?.id ?? null,
    });

    // Dados garantidos: libera a UI antes de qualquer chamada externa.
    const createdTitle = form.title.trim();
    const startLabel = formatDateBR(form.startDate || effectiveDate);
    const dueLabel = formatDateBR(effectiveDate);
    const number = resolveMemberWhatsApp(form.assignee, members.data);
    const actorName = currentUser.name;

    toast.success("Atividade criada com sucesso!");
    handleClose();

    // Fire-and-forget: falha de WhatsApp nunca afeta o dado nem a tela.
    if (number) {
      void notify({
        data: {
          number,
          taskTitle: createdTitle,
          startDate: startLabel,
          endDate: dueLabel,
          platformLink: platformLink(inserted?.id ?? null),
          actorName,
          action: "create",
        },
      }).catch((err) => {
        console.error("[whatsapp-notify] dispatch failed", err);
      });
    }
  }

  const inputClass =
    "w-full min-h-[44px] rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-[#042C53] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-[#185FA5]";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#042C53]/70";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1A1A]/50 p-4 backdrop-blur-sm transition-all"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-white px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-[#042C53]">Nova atividade</h2>
              <p className="text-xs text-muted-foreground">
                Preencha os dados para criar uma nova tarefa
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="grid h-11 w-11 place-items-center rounded-lg text-[#042C53]/70 hover:bg-[#042C53]/5"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto bg-[#F7F6F2] px-5 py-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="nt-title" className={labelClass}>
                  Título da atividade *
                </label>
                <input
                  id="nt-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inputClass}
                  placeholder="Ex.: Revisar cardápio da semana"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="nt-assignee" className={labelClass}>
                  Atribuir para *
                </label>
                <select
                  id="nt-assignee"
                  value={form.assignee}
                  onChange={(e) => set("assignee", e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Selecione um membro</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.role ? ` · ${m.role}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="nt-priority" className={labelClass}>
                  Prioridade
                </label>
                <select
                  id="nt-priority"
                  value={form.priority}
                  onChange={(e) =>
                    set("priority", e.target.value as "alta" | "media" | "baixa")
                  }
                  className={inputClass}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="nt-start" className={labelClass}>
                    Início
                  </label>
                  <input
                    id="nt-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="nt-due" className={labelClass}>
                    Prazo
                  </label>
                  <input
                    id="nt-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set("dueDate", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="nt-desc" className={labelClass}>
                  Descrição / Observações
                </label>
                <textarea
                  id="nt-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={cn(inputClass, "min-h-[96px] resize-y")}
                  rows={4}
                  placeholder="Detalhes, entregáveis, links…"
                />
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-border/60 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 min-w-[100px] rounded-lg border border-border bg-white px-4 text-sm font-medium text-[#042C53] hover:bg-[#042C53]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 min-w-[160px] rounded-lg bg-[#D85A30] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c24f2a] disabled:opacity-70"
            >
              {submitting ? "Criando..." : "Criar Atividade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
