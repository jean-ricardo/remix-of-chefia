import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ListPlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useActivities, useRotinaRealtime, useTeamMembers } from "@/lib/useRotina";
import {
  PRIORITY_LABEL,
  RECURRENCE_LABEL,
  WEEKDAY_LABEL,
  WEEKDAY_LONG,
  ymd,
  type Priority,
  type RecurrenceType,
} from "@/lib/rotina";

export const Route = createFileRoute("/atividades")({
  component: AtividadesPage,
});

function AtividadesPage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();

  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("none");
  const [priority, setPriority] = useState<Priority>("media");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("diaria");
  const [weekday, setWeekday] = useState<number>(1);
  const [monthDay, setMonthDay] = useState<number>(1);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const memberById = new Map((members.data ?? []).map((m) => [m.id, m]));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (recurrence === "unica" && !dueDate) {
      toast.error("Escolha uma data para atividade única");
      return;
    }
    setBusy(true);
    const payload = {
      title: title.trim(),
      assigned_user_id: assignee === "none" ? null : assignee,
      priority,
      recurrence_type: recurrence,
      weekday: recurrence === "semanal" ? weekday : null,
      month_day: recurrence === "mensal" ? monthDay : null,
      due_date: recurrence === "unica" && dueDate ? ymd(dueDate) : null,
    };
    const { error } = await supabase.from("activities").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Atividade cadastrada");
      setTitle("");
      setAssignee("none");
      setPriority("media");
      setRecurrence("diaria");
      setDueDate(undefined);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta atividade e todo o seu histórico?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Atividade removida");
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">Atividades</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">Catálogo de atividades</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre atividades com recorrência diária, semanal, mensal ou única.
          </p>
        </header>

        <form
          onSubmit={add}
          className="grid gap-4 rounded-2xl border border-border/60 bg-surface p-5 shadow-sm md:grid-cols-2"
        >
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="a-title">Título</Label>
            <Input
              id="a-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Revisar caixa do dia"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {(members.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="unica">Única</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            {recurrence === "semanal" && (
              <>
                <Label>Dia da semana</Label>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_LABEL.map((lbl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setWeekday(i)}
                      className={cn(
                        "h-9 w-11 rounded-md border text-sm font-medium transition-colors",
                        weekday === i
                          ? "border-navy bg-navy text-navy-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </>
            )}
            {recurrence === "mensal" && (
              <>
                <Label htmlFor="a-monthday">Dia do mês (1–28)</Label>
                <Input
                  id="a-monthday"
                  type="number"
                  min={1}
                  max={28}
                  value={monthDay}
                  onChange={(e) =>
                    setMonthDay(Math.max(1, Math.min(28, Number(e.target.value) || 1)))
                  }
                />
              </>
            )}
            {recurrence === "unica" && (
              <>
                <Label>Data</Label>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start bg-card font-normal",
                        !dueDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Escolher data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        setDueDate(d ?? undefined);
                        setPickerOpen(false);
                      }}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
            {recurrence === "diaria" && (
              <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Repete todos os dias.
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={busy}
              className="bg-amber text-amber-foreground hover:bg-amber/90"
            >
              <ListPlus className="h-4 w-4" />
              Cadastrar atividade
            </Button>
          </div>
        </form>

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          {activities.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : (activities.data ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade cadastrada ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {(activities.data ?? []).map((a) => {
                const m = a.assigned_user_id ? memberById.get(a.assigned_user_id) : null;
                const detail =
                  a.recurrence_type === "semanal"
                    ? `Semanal · ${a.weekday != null ? WEEKDAY_LONG[a.weekday] : ""}`
                    : a.recurrence_type === "mensal"
                      ? `Mensal · dia ${a.month_day}`
                      : a.recurrence_type === "unica"
                        ? `Única · ${a.due_date ? format(new Date(a.due_date + "T00:00"), "PPP", { locale: ptBR }) : ""}`
                        : "Diária";
                return (
                  <li key={a.id} className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        a.priority === "alta"
                          ? "bg-danger"
                          : a.priority === "media"
                            ? "bg-amber"
                            : "bg-navy",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-navy">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {PRIORITY_LABEL[a.priority]} · {detail} ·{" "}
                        {m?.name ?? "Sem responsável"}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(a.id)}
                      className="text-danger hover:bg-danger/10 hover:text-danger"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

void RECURRENCE_LABEL;
