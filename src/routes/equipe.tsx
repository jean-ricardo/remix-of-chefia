import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivities, useRotinaRealtime, useTeamMembers } from "@/lib/useRotina";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
});

function EquipePage() {
  useRotinaRealtime();
  const members = useTeamMembers();
  const activities = useActivities();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    (activities.data ?? []).forEach((a) => {
      if (a.assigned_user_id)
        c.set(a.assigned_user_id, (c.get(a.assigned_user_id) ?? 0) + 1);
    });
    return c;
  }, [activities.data]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("team_members")
      .insert({ name: name.trim(), role: role.trim() || null });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Membro adicionado");
      setName("");
      setRole("");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover este membro? As atividades atribuídas ficarão sem responsável.")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Membro removido");
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber">Equipe</p>
          <h1 className="mt-1 text-3xl font-bold text-navy">Membros</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre as pessoas responsáveis pelas atividades da rotina.
          </p>
        </header>

        <form
          onSubmit={add}
          className="grid gap-4 rounded-2xl border border-border/60 bg-surface p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="m-name">Nome</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ana Souza"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-role">Função/Cargo</Label>
            <Input
              id="m-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex.: Coordenadora"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="bg-amber text-amber-foreground hover:bg-amber/90 h-10"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar
          </Button>
        </form>

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          {members.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : (members.data ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum membro cadastrado ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {(members.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-4 p-4">
                  <div
                    aria-hidden
                    className="hexagon flex h-10 w-10 items-center justify-center bg-navy text-navy-foreground font-bold uppercase"
                  >
                    {m.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-navy">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.role || "Sem função definida"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Atividades
                    </div>
                    <div className="text-lg font-bold tabular-nums text-navy">
                      {counts.get(m.id) ?? 0}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(m.id)}
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
