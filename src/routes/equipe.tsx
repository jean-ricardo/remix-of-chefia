import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Loader2, Mail, Trash2, UserPlus, UserRoundCheck, Users, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { logActivity } from "@/lib/activityLog";

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
  status?: "pendente" | "aprovado" | null;
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acesso restrito à diretoria e administradores.");
      navigate({ to: "/", replace: true });
    }
  }, [isAdmin, navigate]);

  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [dynamicCode, setDynamicCode] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"membro" | "diretor">("membro");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const teamCode = dynamicCode || currentUser.id;
  const signupUrl =
    typeof window !== "undefined" ? `${window.location.origin}/cadastrar` : "/cadastrar";

  async function copyValue(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
      toast.success(
        kind === "code" ? "Código da equipe copiado!" : "Link de cadastro copiado!",
      );
    } catch {
      setInviteLink(value);
      toast.warning("Não foi possível copiar automaticamente. Copie manualmente abaixo.");
    }
  }

  const pending = useQuery({
    queryKey: ["team_members", "pending", teamCode],
    enabled: isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("team_members")
        .select("id,name,email,role,created_at,team_id")
        .eq("cargo_principal", "pendente")
        .order("created_at", { ascending: false });

      if (currentUser.team_id) {
        query = query.eq("team_id", currentUser.team_id);
      } else {
        // Fallback for legacy invitation codes if needed, but multi-team relies on team_id
        query = query.eq("role", `equipe:${teamCode}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRefresh = async () => {
    setBusyId("refresh");
    await Promise.all([
      pending.refetch(),
      members.refetch(),
    ]);
    setBusyId(null);
    toast.info("Status atualizado!");
  };


  async function approve(id: string, name: string) {
    setBusyId(id);
    const { error } = await supabase
      .from("team_members")
      .update({ cargo_principal: "membro", role: "membro" })
      .eq("id", id);
    
    if (error) {
      setBusyId(null);
      toast.error("Não foi possível aprovar agora. Tente novamente.");
      return;
    }
    
    await logActivity({
      actorName: currentUser?.name || "Usuário",
      actionType: "update",
      details: `${currentUser?.name || "Usuário"} aprovou a entrada de ${name} na equipe.`,
    });

    toast.success(`${name} aprovado e vinculado à equipe!`);
    
    // Invalidação agressiva para atualização instantânea
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["team_members"] }),
      queryClient.invalidateQueries({ queryKey: ["team_members", "pending"] }),
    ]);
    setBusyId(null);
  }

  async function reject(id: string, name: string) {
    setBusyId(id);
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    
    if (error) {
      setBusyId(null);
      toast.error("Não foi possível recusar agora. Tente novamente.");
      return;
    }
    
    await logActivity({
      actorName: currentUser?.name || "Usuário",
      actionType: "delete",
      details: `${currentUser?.name || "Usuário"} recusou a solicitação de ${name}.`,
    });
    
    toast.success(`Solicitação de ${name} recusada.`);
    
    // Invalidação agressiva
    await queryClient.invalidateQueries({ queryKey: ["team_members", "pending"] });
    setBusyId(null);
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
    setInviteRole("membro");
    toast.success("Convite enviado com sucesso!");
  }

  async function handleDeleteMember() {
    if (!memberToDelete || !isAdmin) return;
    
    setIsDeleting(true);
    try {
      // 1. Auditoria (Registrado antes da exclusão para garantir que os dados do ator existam)
      await logActivity({
        actorName: currentUser?.name || "Usuário",
        actionType: "delete",
        details: `${currentUser?.name || "Usuário"} excluiu permanentemente a conta e o perfil do membro ${memberToDelete.name} da plataforma.`,
      });

      // 2. Chamar a nova função RPC para exclusão total (incluindo auth.users)
      const { error } = await supabase.rpc('delete_user_account', { 
        target_user_id: memberToDelete.id 
      });

      if (error) throw error;

      toast.success("Membro e conta de acesso removidos com sucesso.");
      
      // 3. Atualização de estado e cache
      await queryClient.invalidateQueries({ queryKey: ["team_members"] });
      await queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      setMemberToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir membro:", error);
      toast.error(error.message || "Não foi possível remover o membro. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
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
                  onClick={() => {
                    setDynamicCode(crypto.randomUUID().split("-")[0].toUpperCase());
                    setCodeOpen(true);
                  }}
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

        {isAdmin && (pending.data?.length ?? 0) > 0 ? (
          <section className="rounded-2xl border border-amber/40 bg-warning/10 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserRoundCheck className="h-4 w-4 text-amber" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-navy">
                  Aguardando aprovação ({pending.data?.length})
                </h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={busyId === "refresh"}
                className="h-8 gap-1 rounded-lg text-xs font-semibold text-amber hover:bg-amber/10 hover:text-amber"
              >
                <Loader2 className={cn("h-3.5 w-3.5", busyId === "refresh" && "animate-spin")} />
                Atualizar Status
              </Button>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {(pending.data ?? []).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-border/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={p.name ?? "Membro"} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#042C53]">
                        {p.name || "Novo membro"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.email || "Sem e-mail"}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Button
                      onClick={() => void approve(p.id, p.name || "Membro")}
                      disabled={busyId === p.id}
                      className="h-11 flex-1 rounded-lg bg-success font-medium text-white hover:bg-success/90 sm:flex-none"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void reject(p.id, p.name || "Membro")}
                      disabled={busyId === p.id}
                      className="h-11 flex-1 rounded-lg border-danger/30 font-medium text-danger hover:bg-danger/10 sm:flex-none"
                    >
                      <X className="h-4 w-4" />
                      Recusar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
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
                      <RoleSelect 
                        memberId={m.id} 
                        memberName={name} 
                        currentCargo={m.role || "membro"} 
                        canEdit={currentUser.role === "diretor"} 
                      />
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMemberToDelete({ id: m.id, name: name });
                          }}
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

      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">Convidar Membro</DialogTitle>
            <DialogDescription>
              Envie o link de cadastro e o Código da Equipe. O novo membro só acessa a
              plataforma após sua aprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Código da Equipe</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={teamCode}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={() => void copyValue(teamCode, "code")}
                  className="h-11 shrink-0 rounded-lg bg-[#D85A30] px-3 font-medium text-white hover:bg-[#c14e28]"
                >
                  {copied === "code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copiar
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link de cadastro</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={signupUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyValue(signupUrl, "link")}
                  className="h-11 shrink-0 rounded-lg border-navy/20 px-3 font-medium text-navy hover:bg-navy/5"
                >
                  {copied === "link" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                onValueChange={(v) => setInviteRole(v as "membro" | "diretor")}
              >
                <SelectTrigger id="invite-role" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="diretor">Diretor</SelectItem>
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

      <AlertDialog 
        open={!!memberToDelete} 
        onOpenChange={(open) => !open && !isDeleting && setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir membro da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro? Todas as atividades e dados vinculados a ele serão permanentemente apagados da plataforma. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteMember();
              }}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function RoleSelect({ 
  memberId, 
  memberName, 
  currentCargo, 
  canEdit 
}: { 
  memberId: string; 
  memberName: string; 
  currentCargo: string; 
  canEdit: boolean; 
}) {
  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const [updating, setUpdating] = useState(false);

  // Normalize current value to match select options
  const normalizedValue = useMemo(() => {
    const v = currentCargo.toLowerCase();
    if (v === "diretor") return "diretor";
    if (v === "admin" || v === "adm" || v === "diretor") return "diretor";
    return "membro";
  }, [currentCargo]);

  const handleRoleChange = async (newCargo: string) => {
    if (!canEdit || updating) return;
    
    // REGRA DE SEGURANÇA (ANTI-LOCKOUT):
    // Se o usuário está tentando mudar o PRÓPRIO cargo e ele é Diretor...
    const isSelf = currentUser.id === memberId;
    const isDemotingSelfFromDiretor = isSelf && 
      normalizedValue === "diretor" && 
      newCargo !== "diretor";

    setUpdating(true);
    try {
      // Se for auto-rebaixamento, precisamos verificar se existe outro Diretor
      if (isDemotingSelfFromDiretor) {
        const { count, error: countError } = await supabase
          .from("team_members")
          .select("*", { count: 'exact', head: true })
          .eq("cargo_principal", "diretor");

        if (countError) throw countError;

        if (count !== null && count <= 1) {
          toast.error("Ação negada: Você é o único Diretor ativo. Promova outro membro a Diretor antes de alterar o seu próprio cargo.");
          setUpdating(false);
          return;
        }
      }

      const { error } = await supabase
        .from("team_members")
        .update({ 
          cargo_principal: newCargo,
          role: newCargo.toLowerCase() === "diretor" ? "diretor" : "membro" 
        })
        .eq("id", memberId);

      if (error) throw error;

      await logActivity({
        actorName: currentUser.name || "Gestor",
        actionType: "update",
        details: `${currentUser.cargo?.charAt(0).toUpperCase()}${currentUser.cargo?.slice(1)} ${currentUser.name} alterou o cargo de ${memberName} para ${newCargo.charAt(0).toUpperCase() + newCargo.slice(1)}.`,
      });

      toast.success("Cargo atualizado com sucesso. As permissões foram aplicadas.");
      
      // Invalida a lista de membros e o usuário atual se for ele mesmo
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["team_members"] }),
        currentUser.id === memberId ? supabase.auth.refreshSession() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Erro ao atualizar cargo:", err);
      toast.error("Não foi possível atualizar o cargo.");
    } finally {
      setUpdating(false);
    }
  };

  if (!canEdit) {
    return (
      <span className="inline-flex h-6 items-center rounded-full border border-navy/15 bg-navy/5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
        {currentCargo}
      </span>
    );
  }

  return (
    <Select 
      value={normalizedValue} 
      onValueChange={handleRoleChange} 
      disabled={updating}
    >
      <SelectTrigger className="h-7 w-[130px] rounded-full border-navy/20 bg-surface px-3 text-[10px] font-bold uppercase tracking-wider text-navy hover:bg-navy/5 focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="membro" className="text-[11px] font-semibold uppercase tracking-wide">Membro</SelectItem>
        <SelectItem value="diretor" className="text-[11px] font-semibold uppercase tracking-wide">Diretor</SelectItem>
      </SelectContent>
    </Select>
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
