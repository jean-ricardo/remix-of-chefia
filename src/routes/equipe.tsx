import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivities, useRotinaRealtime, useTeamMembers } from "@/lib/useRotina";
import { useMockUser } from "@/lib/mockUser";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
});

const LICENSE_CAP = 10;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function EquipePage() {
  useRotinaRealtime();
  const currentUser = useMockUser();
  const isAdmin = currentUser.role === "admin";
  const members = useTeamMembers();
  const activities = useActivities();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteBusy, setInviteBusy] = useState(false);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    (activities.data ?? []).forEach((a) => {
      if (a.assigned_user_id)
        c.set(a.assigned_user_id, (c.get(a.assigned_user_id) ?? 0) + 1);
    });
    return c;
  }, [activities.data]);

  const memberList = members.data ?? [];
  const inUse = memberList.length;

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    // Mocked invite: simulate latency and show success toast (no backend change).
    await new Promise((r) => setTimeout(r, 500));
    setInviteBusy(false);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("member");
    toast.success("Convite enviado com sucesso!");
  }

  async function remove(id: string) {
    if (!isAdmin) return;
    if (!confirm("Remover este membro? As atividades atribuídas ficarão sem responsável.")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Membro removido");
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="space-y-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">Equipe</p>
            <h1 className="mt-1 truncate text-2xl font-bold text-navy sm:text-3xl">Membros</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gerencie as pessoas responsáveis pelas atividades da rotina.
            </p>
          </div>

          {isAdmin && (
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Badge
                variant="outline"
                className="h-8 gap-1.5 rounded-full border-navy/20 bg-surface px-3 text-[11px] font-semibold uppercase tracking-wide text-navy"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
                Licenças: {inUse}/{LICENSE_CAP} em uso
              </Badge>
              <Button
                onClick={() => setInviteOpen(true)}
                className="h-11 min-w-[44px] bg-amber text-amber-foreground hover:bg-amber/90"
              >
                <UserPlus className="h-4 w-4" />
                Convidar Novo Membro
              </Button>
            </div>
          )}
        </header>

        {/* Desktop: table */}
        <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm md:block">
          {members.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : memberList.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum membro cadastrado ainda.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-2/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Membro</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Atividades</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {memberList.map((m, idx) => {
                  // Mock: first member marked as Pendente to showcase status.
                  const status: "ativo" | "pendente" =
                    idx === 0 && memberList.length > 1 ? "pendente" : "ativo";
                  return (
                    <tr
                      key={m.id}
                      className="group transition-colors hover:bg-surface/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-navy">{m.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {m.role || "Sem função definida"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role="Membro" />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-5 py-4 text-right text-base font-bold tabular-nums text-navy">
                        {counts.get(m.id) ?? 0}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(m.id)}
                            className="h-11 w-11 text-danger hover:bg-danger/10 hover:text-danger"
                            aria-label={`Remover ${m.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile: card list */}
        <div className="grid gap-3 md:hidden">
          {members.isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
              Carregando…
            </div>
          ) : memberList.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
              Nenhum membro cadastrado ainda.
            </div>
          ) : (
            memberList.map((m, idx) => {
              const status: "ativo" | "pendente" =
                idx === 0 && memberList.length > 1 ? "pendente" : "ativo";
              return (
                <article
                  key={m.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-navy">{m.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.role || "Sem função definida"}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(m.id)}
                        className="h-11 w-11 shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
                        aria-label={`Remover ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <RoleBadge role="Membro" />
                    <StatusBadge status={status} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      <span className="font-bold tabular-nums text-navy">
                        {counts.get(m.id) ?? 0}
                      </span>{" "}
                      atividades
                    </span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">Convidar Novo Membro</DialogTitle>
            <DialogDescription>
              Envie um convite por e-mail para adicionar uma pessoa à sua equipe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-mail do colaborador</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nome@empresa.com"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Papel na Conta</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "member" | "admin")}
              >
                <SelectTrigger id="invite-role" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
                className="h-11"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={inviteBusy}
                className="h-11 bg-amber text-amber-foreground hover:bg-amber/90"
              >
                <Mail className="h-4 w-4" />
                Enviar Convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold uppercase text-navy-foreground ring-2 ring-amber/30"
    >
      {initialsOf(name)}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-navy/15 bg-navy/5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: "ativo" | "pendente" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide",
        status === "ativo"
          ? "bg-success/15 text-success"
          : "bg-warning/20 text-amber-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "ativo" ? "bg-success" : "bg-amber",
        )}
        aria-hidden
      />
      {status === "ativo" ? "Ativo" : "Pendente"}
    </span>
  );
}
