import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/lib/useRotina";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { sendWhatsAppNotification } from "@/lib/whatsapp-notify.functions";
import { formatDateBR, platformLink, resolveMemberWhatsApp } from "@/lib/taskNotify";
import type { OccurrenceView, Priority } from "@/lib/rotina";

export type EditMode = "edit" | "reschedule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: OccurrenceView | null;
  mode: EditMode;
}

/** yyyy-MM-dd local, sem conversão UTC (evita saltos de fuso). */
function toYmd(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Slide-over unificado de Edição / Reprogramação.
 * Escreve de verdade no banco — sem alterar schema nem políticas:
 *  - edit: UPDATE em `activities` (title, priority, assigned_user_id, due_date).
 *  - reschedule: INSERT em `reschedules` (nunca reescreve a atividade).
 */
export function EditActivitySheet({
  open,
  onOpenChange,
  occurrence,
  mode,
}: Props) {
  const qc = useQueryClient();
  const members = useTeamMembers();
  const currentUser = useCurrentUser();
  const notify = useServerFn(sendWhatsAppNotification);
  const dateRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !occurrence) return;
    const a = occurrence.activity;
    setTitle(a?.title ?? "");
    setPriority((a?.priority as Priority) ?? "media");
    setAssignee(a?.assigned_user_id ?? "");
    setDueDate(toYmd(occurrence?.effectiveDate));
    setReason("");
    setSubmitting(false);
  }, [open, occurrence]);

  // Reschedule mode: focus the date field.
  useEffect(() => {
    if (!open || mode !== "reschedule") return;
    const t = setTimeout(() => {
      dateRef.current?.focus();
      dateRef.current?.showPicker?.();
    }, 220);
    return () => clearTimeout(t);
  }, [open, mode]);

  const isCompleted = !!occurrence?.completed;
  const rescheduleLocked = mode === "reschedule" && isCompleted;

  function dispatchWhatsApp(
    action: "update" | "reschedule",
    taskTitle: string,
    memberId: string | null,
    dueLabel: string,
    taskId?: string | null,
  ) {
    const number = resolveMemberWhatsApp(memberId, members.data);
    if (!number) return;
    void notify({
      data: {
        number,
        taskTitle,
        startDate: dueLabel,
        endDate: dueLabel,
        platformLink: platformLink(taskId),
        actorName: currentUser.name,
        action,
      },
    }).catch((err) => {
      // Falha do WhatsApp jamais afeta o dado nem a UI.
      console.error("[whatsapp-notify] dispatch failed", err);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !occurrence) return;

    const activity = occurrence.activity;

    if (mode === "reschedule") {
      if (rescheduleLocked) {
        toast.error("Tarefas concluídas não podem ser reprogramadas.");
        return;
      }
      if (!dueDate) {
        toast.error("Selecione a nova data.");
        return;
      }
      setSubmitting(true);
      const { error } = await supabase.from("reschedules").insert({
        activity_id: activity.id,
        original_occurrence_key: occurrence.originalKey,
        new_date: dueDate, // coluna `date`: string yyyy-MM-dd, sem fuso
        justification: reason.trim(),
      });
      if (error) {
        console.error("[reschedules] insert failed", error);
        toast.error("Não foi possível reprogramar a atividade");
        setSubmitting(false);
        return;
      }

      void logActivity({
        actorName: currentUser.name,
        actionType: "reschedule",
        details: `Reprogramou "${activity.title}" para ${formatDateBR(dueDate)}${
          reason.trim() ? ` — ${reason.trim()}` : ""
        }.`,
        taskId: activity.id,
      });

      await qc.invalidateQueries({ queryKey: ["reschedules"] });
      setSubmitting(false);
      onOpenChange(false);
      toast.success("Atividade reprogramada com sucesso!");
      dispatchWhatsApp(
        "reschedule",
        activity.title,
        activity.assigned_user_id,
        formatDateBR(dueDate),
      );
      return;
    }

    // ----- edit -----
    if (!title.trim()) {
      toast.error("Informe o título da atividade");
      return;
    }
    setSubmitting(true);

    const patch: {
      title: string;
      priority: Priority;
      assigned_user_id: string | null;
      due_date?: string | null;
    } = {
      title: title.trim(),
      priority,
      assigned_user_id: assignee || null,
    };
    // due_date só é reescrita em atividades únicas; recorrentes usam reschedules.
    if (activity.recurrence_type === "unica") {
      patch.due_date = dueDate || null;
    }


    const { error } = await supabase
      .from("activities")
      .update(patch)
      .eq("id", activity.id);

    if (error) {
      console.error("[activities] update failed", error);
      toast.error("Não foi possível salvar as alterações");
      setSubmitting(false);
      return;
    }

    // Data-shift em recorrentes vira reprogramação da ocorrência atual.
    const originalYmd = toYmd(occurrence.effectiveDate);
    if (
      activity.recurrence_type !== "unica" &&
      dueDate &&
      dueDate !== originalYmd &&
      !isCompleted
    ) {
      const { error: rErr } = await supabase.from("reschedules").insert({
        activity_id: activity.id,
        original_occurrence_key: occurrence.originalKey,
        new_date: dueDate,
        justification: reason.trim(),
      });
      if (rErr) console.error("[reschedules] insert failed", rErr);
      else await qc.invalidateQueries({ queryKey: ["reschedules"] });
    }

    void logActivity({
      actorName: currentUser.name,
      actionType: "update",
      details: `Atualizou a atividade "${title.trim()}".`,
      taskId: activity.id,
    });

    await qc.invalidateQueries({ queryKey: ["activities"] });
    setSubmitting(false);
    onOpenChange(false);
    toast.success("Atividade atualizada com sucesso!");
    dispatchWhatsApp(
      "update",
      title.trim(),
      assignee || null,
      formatDateBR(dueDate || originalYmd),
    );
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-[#042C53] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 focus:border-[#185FA5] disabled:opacity-60";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#042C53]/70";

  const heading =
    mode === "reschedule" ? "Reprogramar atividade" : "Editar atividade";
  const subheading =
    mode === "reschedule"
      ? "Ajuste a data de vencimento e salve as alterações."
      : "Atualize as informações da tarefa.";

  return (
    <Sheet open={open} onOpenChange={(o) => (submitting ? null : onOpenChange(o))}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0 sm:max-w-md",
          "data-[state=open]:duration-300",
        )}
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          {/* Fixed Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-white px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[#042C53]">
                {heading}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {subheading}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#042C53]/70 hover:bg-[#042C53]/5 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto bg-[#F7F6F2] px-5 py-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-title" className={labelClass}>
                  Título da atividade
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  disabled={submitting || mode === "reschedule"}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Prioridade</label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                  disabled={submitting || mode === "reschedule"}
                >
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className={labelClass}>Responsável</label>
                <Select
                  value={assignee}
                  onValueChange={setAssignee}
                  disabled={submitting || mode === "reschedule"}
                >
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members.data ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.role ? ` · ${m.role}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="edit-due-date" className={labelClass}>
                  Data de vencimento
                  {mode === "reschedule" && (
                    <span className="ml-2 rounded-full bg-[#185FA5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#185FA5]">
                      Novo agendamento
                    </span>
                  )}
                </label>
                <input
                  ref={dateRef}
                  id="edit-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting || rescheduleLocked}
                  className={cn(
                    inputClass,
                    mode === "reschedule" &&
                      "ring-2 ring-[#185FA5]/40 border-[#185FA5]",
                  )}
                />
              </div>

              <div>
                <label htmlFor="edit-reason" className={labelClass}>
                  Justificativa da reprogramação (opcional)
                </label>
                <textarea
                  id="edit-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting || rescheduleLocked}
                  className={cn(inputClass, "min-h-[96px] resize-y")}
                  rows={4}
                  placeholder="Motivo da nova data…"
                />
              </div>

              {rescheduleLocked && (
                <p className="text-xs italic text-gray-400">
                  Tarefas concluídas não podem ser reprogramadas.
                </p>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-11 min-w-[100px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || rescheduleLocked}
              className="h-11 min-w-[160px] bg-[#185FA5] font-semibold text-white hover:bg-[#042C53] disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : mode === "reschedule" ? (
                "Confirmar reprogramação"
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
