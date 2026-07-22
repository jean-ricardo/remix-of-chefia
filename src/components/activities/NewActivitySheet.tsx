import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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

interface Props {
  trigger: React.ReactNode;
}

export function NewActivitySheet({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const members = useTeamMembers();

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [priority, setPriority] = useState<string>("media");
  const [assignee, setAssignee] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [description, setDescription] = useState("");

  function reset() {
    setTitle("");
    setClient("");
    setPriority("media");
    setAssignee("");
    setDueDate("");
    setDescription("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da atividade");
      return;
    }
    // MOCK ONLY — no backend mutation.
    toast.success("Atividade criada com sucesso!");
    setOpen(false);
    reset();
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-[#042C53] placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 focus:border-[#185FA5]";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#042C53]/70";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
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
            <div>
              <h2 className="text-lg font-bold text-[#042C53]">Nova atividade</h2>
              <p className="text-xs text-muted-foreground">
                Preencha os dados para criar uma nova tarefa
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-lg text-[#042C53]/70 hover:bg-[#042C53]/5"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto bg-[#F7F6F2] px-5 py-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={labelClass}>
                  Título da atividade
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Ex.: Revisar cardápio da semana"
                  required
                />
              </div>

              <div>
                <label htmlFor="client" className={labelClass}>
                  Cliente / Projeto
                </label>
                <input
                  id="client"
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
                <label htmlFor="due-date" className={labelClass}>
                  Data de vencimento
                </label>
                <input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>
                  Descrição / Observações
                </label>
                <textarea
                  id="description"
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
              onClick={() => setOpen(false)}
              className="h-11 min-w-[100px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[160px] bg-[#185FA5] font-semibold text-white hover:bg-[#042C53]"
            >
              Criar atividade
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
