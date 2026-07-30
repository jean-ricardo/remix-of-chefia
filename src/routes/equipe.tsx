import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";
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
import { hasGlobalScope, useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
});

const LICENSE_CAP = 10;

function initialsOf(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

interface MemberLike {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

function displayNameOf(m: MemberLike) {
  return m?.full_name || m?.name || m?.email || "Membro";
}

function EquipePage() {
  useRotinaRealtime();
  const currentUser = useCurrentUser();
  const isAdmin = hasGlobalScope(currentUser.role);
  const members = useTeamMembers();
  const activities = useActivities();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteBusy, setInviteBusy] = useState(false);

  async function copyInviteLink() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/cadastrar` : "/cadastrar";
    try {
      await navigator.clipboard.writeText(url);
      setInviteLink("");
      toast.success("Link de convite copiado para a área de transferência!");
    } catch {
      setInviteLink(url);
      toast.warning("Não foi possível copiar automaticamente. Copie o link abaixo.");
    }
  }

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    (activities.data ?? []).forEach((a) => {
      if (a.assigned_user_id)
        c.set(a.assigned_user_id, (c.get(a.assigned_user_id) ?? 0) + 1);
    });
    return c;
  }, [activities.data]);

  const memberList = (members.data ?? []) as MemberLike[];
  const inUse = memberList.length;

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setInviteBusy(false);
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("member");
    toast.success("Convite enviado com sucesso!");
  }

  function removeMock(e: React.MouseEvent, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    toast.success(`Membro removido (Mock)`, {
      description: name ? `${name} foi removido apenas nesta simulação.` : undefined,
    });
  }

  return (
    <>
      <Toaster richColors />
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber">
              Equipe
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-navy sm:text-3xl">
                Membros
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Gerencie as pessoas responsáveis pelas atividades da rotina.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="h-8 gap-1.5 rounded-full border-navy/20 bg-surface px-3 text-[11px] font-semibold uppercase tracking-wide text-navy"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
              Licenças: {inUse}/{LICENSE_CAP} em uso
            </Badge>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={copyInviteLink}
                  className="h-10 rounded-lg border-navy/20 px-4 font-medium text-navy hover:bg-navy/5"
                >
                  <Link2 className="h-4 w-4" />
                  Convidar Membro
                </Button>
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="h-10 rounded-lg bg-[#D85A30] px-4 font-medium text-white hover:bg-[#c14e28]"
                >
                  <UserPlus className="h-4 w-4" />
                  Convidar por e-mail
                </Button>
              </>
            )}
          </div>
        </header>

        {isAdmin && inviteLink ? (
          <div className="rounded-xl border border-navy/15 bg-surface p-4">
            <p className="text-xs font-medium text-navy">
              Copie manualmente o link de cadastro:
            </p>
            <Input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-2 h-11 bg-white text-sm"
            />
          </div>
        ) : null}

        {/* Responsive list — NO tables */}
        {members.isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Carregando…
          </div>
        ) : memberList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-navy">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-navy">
              Nenhum membro cadastrado ainda.
            </p>
            <p className="text-xs text-muted-foreground">
              Convide sua equipe para começar a distribuir a rotina.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {memberList.map((m, idx) => {
              const name = displayNameOf(m);
              const status: "ativo" | "pendente" =
                idx === 0 && memberList.length > 1 ? "pendente" : "ativo";
              const count = counts.get(m.id) ?? 0;
              return (
                <li key={m.id}>
                  <div
                    className={cn(
                      "rounded-lg bg-white p-4 shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md",
                      "flex flex-col items-start gap-3",
                      "md:flex-row md:items-center md:justify-between md:gap-4",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={name} src={m?.avatar_url ?? undefined} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#042C53]">
                          {name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {m?.email || m?.role || "Sem função definida"}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                      <RoleBadge role="Membro" />
                      <StatusBadge status={status} />
                      <span className="text-xs text-muted-foreground">
                        <span className="font-bold tabular-nums text-navy">
                          {count}
                        </span>{" "}
                        atividades
                      </span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => removeMock(e, name)}
                          className="h-10 w-10 shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
                          aria-label={`Remover ${name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
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
              <Label htmlFor="invite-email">E-mail corporativo</Label>
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
              <Label htmlFor="invite-role">Nível de Acesso</Label>
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
                className="h-11 rounded-lg bg-[#D85A30] font-medium text-white hover:bg-[#c14e28]"
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

function Avatar({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-amber/30"
      />
    );
  }
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
