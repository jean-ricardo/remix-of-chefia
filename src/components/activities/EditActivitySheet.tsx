import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeamMembers } from "@/lib/useRotina";
import { cn } from "@/lib/utils";
import type { OccurrenceView } from "@/lib/rotina";

export type EditMode = "edit" | "reschedule";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: OccurrenceView | null;
  mode: EditMode;
}

/**
 * Reuses the create-activity Slide-over pattern for Editing / Rescheduling.
 * MOCK ONLY — no backend mutations are fired on submit.
 */
export function EditActivitySheet({
  open,
  onOpenChange,
  occurrence,
  mode,
}: Props) {
  const members = useTeamMembers();
  const dateRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [priority, setPriority] = useState<string>("media");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [description, setDescription] = useState("");

  // Pre-fill defensively — any missing legacy field falls back safely.
  useEffect(() => {
    if (!open || !occurrence) return;
    const a = occurrence.activity as typeof occurrence.activity & {
      client_name?: string | null;
      description?: string | null;
    };
    setTitle(a?.title ?? "");
    setClient(a?.client_name ?? "");
    setPriority(a?.priority ?? "media");
    setAssignee(a?.assigned_user_id ?? "");
    const d = occurrence?.effectiveDate;
    setDueDate(
      d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate(),
          ).padStart(2, "0")}`
        : "",
    );
    setDescription(a?.description ?? "");
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da atividade");
      return;
    }
    // MOCK ONLY — no PUT/PATCH sent to the backend.
    toast.success("Atividade atualizada com sucesso!");
    onOpenChange(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-[#042C53] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 focus:border-[#185FA5]";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#042C53]/70";

  const heading =
    mode === "reschedule" ? "Reprogramar atividade" : "Editar atividade";
  const subheading =
    mode === "reschedule"
      ? "Ajuste a data de vencimento e salve as alterações."
      : "Atualize as informações da tarefa.";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#042C53]/70 hover:bg-[#042C53]/5"
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
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-client" className={labelClass}>
                  Cliente / Projeto
                </label>
                <input
                  id="edit-client"
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className={inputClass}
                  placeholder="Ex.: Restaurante Central"
                />
              </div>

              <div>
                <label className={labelClass}>Prioridade</label>
                <Select value={priority} onValueChange={setPriority}>
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
                <Select value={assignee} onValueChange={setAssignee}>
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
                  className={cn(
                    inputClass,
                    mode === "reschedule" &&
                      "ring-2 ring-[#185FA5]/40 border-[#185FA5]",
                  )}
                />
              </div>

              <div>
                <label htmlFor="edit-description" className={labelClass}>
                  Descrição / Observações
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cn(inputClass, "min-h-[96px] resize-y")}
                  rows={4}
                  placeholder="Detalhes, entregáveis, links…"
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-w-[100px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[160px] bg-[#185FA5] font-semibold text-white hover:bg-[#042C53]"
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
