import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Activity } from "./rotina";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/**
 * Real authentication + RBAC.
 *
 * Supabase Auth owns the identity (session/email). The business role comes from
 * the existing `team_members` table, matched by the authenticated e-mail:
 *
 *   cargo_principal: 'diretor' | 'adm' | 'membro'
 *      → app role:   'admin'   | 'gestor' | 'usuario'
 *
 * Users that authenticate but have no matching row in `team_members` fall back
 * to the lowest tier ('usuario') — deny by default.
 */
export type AppRole = "admin" | "gestor" | "usuario";

export interface CurrentUser {
  /** team_members.id when mapped, otherwise the auth user id. */
  id: string;
  name: string;
  email: string;
  telefone?: string;
  role: AppRole;
  /** Raw value from team_members.cargo_principal (null when unmapped). */
  cargo: string | null;
  /** True when the e-mail was found in team_members. */
  mapped: boolean;
  /** Cadastro aguardando aprovação do Adm/Diretor (cargo_principal = 'pendente'). */
  pending: boolean;
  /** UUID from teams table. */
  team_id: string | null;
}

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: CurrentUser | null;
  signOut: () => Promise<void>;
}

/** Marcador de cadastro pendente (sem alterar schema: usa cargo_principal). */
export const PENDING_CARGO = "pendente";

/** Usuários antigos (cargo nulo ou qualquer outro valor) contam como aprovados. */
export function isPendingCargo(cargo: unknown): boolean {
  return String(cargo ?? "").trim().toLowerCase() === PENDING_CARGO;
}

export function mapCargoToRole(cargo: unknown): AppRole {
  const c = String(cargo ?? "").trim().toLowerCase();
  if (c === "diretor" || c === "director" || c === "admin" || c === "master" || c === "fundador") return "admin";
  if (c === "adm" || c === "gestor" || c === "manager") return "gestor";
  return "usuario";
}

/** Tiers with full visibility and edit rights (diretor + adm). */
export function hasGlobalScope(role: AppRole): boolean {
  return role === "admin" || role === "gestor";
}

/**
 * RBAC action gate for a specific activity.
 * - admin/gestor: allowed on everything.
 * - usuario: only when they are the assignee (or legacy creator match).
 */
export function canActOnActivity(
  user: Pick<CurrentUser, "id" | "role"> | null | undefined,
  activity: Activity & { creator_id?: string | null; assignee_id?: string | null },
): boolean {
  if (!user) return false;
  if (hasGlobalScope(user.role)) return true;
  if (!user.id) return false;
  const assignee = activity.assigned_user_id ?? activity.assignee_id ?? null;
  if (assignee && assignee === user.id) return true;
  if (activity.creator_id && activity.creator_id === user.id) return true;
  return false;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  user: null,
  signOut: async () => {},
});

async function resolveCurrentUser(authUser: User): Promise<CurrentUser> {
  const email = (authUser.email ?? "").trim();
  const fallbackName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    "Usuário";

  if (email) {
    // 1. Try to find an existing team member entry
    let { data, error } = await supabase
      .from("team_members")
      .select("id,name,email,cargo_principal,telefone,team_id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    // 2. If not found, check if this user has "is_director" and "temp_company_name" in metadata
    // This happens when they just signed up via /cadastrar-empresa
    if (!error && !data && authUser.user_metadata?.is_director && authUser.user_metadata?.temp_company_name) {
      try {
        const companyName = authUser.user_metadata.temp_company_name;
        const fullName = authUser.user_metadata.full_name || fallbackName;
        const whatsapp = authUser.user_metadata.whatsapp || "";

        // Create the team
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .insert({ name: companyName })
          .select()
          .single();

        if (!teamError && teamData) {
          // Create the director member entry
          const { data: memberData, error: memberError } = await supabase
            .from("team_members")
            .insert({
              user_id: authUser.id,
              team_id: teamData.id,
              name: fullName,
              email: email,
              telefone: whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`,
              cargo_principal: "Diretor",
              role: "diretor",
            })
            .select()
            .single();

          if (!memberError && memberData) {
            // Update metadata to remove the temp flags so we don't repeat this
            await supabase.auth.updateUser({
              data: { is_director: null, temp_company_name: null }
            });
            data = memberData;
          }
        }
      } catch (err) {
        console.error("Auto-provisioning error:", err);
      }
    }

    if (!error && data) {
      return {
        id: data.id,
        name: data.name || fallbackName,
        email,
        telefone: data.telefone ?? undefined,
        role: mapCargoToRole(data.cargo_principal),
        cargo: data.cargo_principal ?? null,
        mapped: true,
        pending: isPendingCargo(data.cargo_principal),
        team_id: data.team_id ?? null,
      };
    }
  }

  // 3. Auto-provisioning for Single-Tenant
  // Link any authenticated user directly to the primary team.
  const MAIN_TEAM_ID = "b427d038-be4d-4fb7-b112-b8b6447f3984";
  
  try {
    // Check if this is the first user in the system to make them Director
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true });

    const isFirstUser = count === 0;

    const { data: autoMember, error: autoError } = await supabase
      .from("team_members")
      .insert({
        user_id: authUser.id,
        team_id: MAIN_TEAM_ID,
        name: fallbackName,
        email: email,
        cargo_principal: isFirstUser ? "Diretor" : "Membro",
        role: isFirstUser ? "diretor" : "membro",
      })
      .select()
      .single();

    if (!autoError && autoMember) {
      return {
        id: autoMember.id,
        name: autoMember.name || fallbackName,
        email,
        telefone: autoMember.telefone ?? undefined,
        role: isFirstUser ? "admin" : "usuario",
        cargo: autoMember.cargo_principal,
        mapped: true,
        pending: false,
        team_id: MAIN_TEAM_ID,
      };
    }
  } catch (err) {
    console.error("Auto-provisioning error:", err);
  }

  return {
    id: authUser.id,
    name: fallbackName,
    email,
    role: "usuario",
    cargo: null,
    mapped: false,
    pending: false,
    team_id: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleUpdate, setRoleUpdate] = useState<{ old: string; new: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function apply(next: Session | null) {
      if (!active) return;
      setSession(next);
      if (!next?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      const resolved = await resolveCurrentUser(next.user);
      if (!active) return;
      setUser(resolved);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => void apply(data.session ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(next);
        void apply(next ?? null);
        return;
      }
      void apply(next ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime listener for role changes AND deletions
  useEffect(() => {
    if (!user?.id || !user.mapped) return;

    const channel = supabase
      .channel(`user-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_members",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const oldCargo = payload.old?.cargo_principal;
          const newCargo = payload.new?.cargo_principal;

          if (newCargo && oldCargo !== newCargo) {
            setRoleUpdate({
              old: String(oldCargo || "Membro"),
              new: String(newCargo || "Membro"),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_members",
          filter: `id=eq.${user.id}`,
        },
        () => {
          // Se o registro do usuário foi deletado da team_members, força logout imediato
          // pois ele perdeu o acesso à plataforma.
          console.log("Perfil removido. Encerrando sessão...");
          void supabase.auth.signOut().then(() => {
            window.location.href = "/?reason=removed";
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.mapped]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user,
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      },
    }),
    [loading, session, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      <Dialog open={!!roleUpdate} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-navy">Permissões Atualizadas</DialogTitle>
            <DialogDescription className="pt-3 text-base">
              A administração modificou o seu cargo de <strong>{roleUpdate?.old}</strong> para <strong>{roleUpdate?.new}</strong>. Para que as novas permissões entrem em vigor, é necessário atualizar a plataforma.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full gap-2 bg-[#185FA5] hover:bg-[#042C53]"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Plataforma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** Never null inside protected routes; safe placeholder elsewhere. */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  return (
    user ?? {
      id: "",
      name: "Usuário",
      email: "",
      role: "usuario",
      cargo: null,
      mapped: false,
      pending: false,
      team_id: null,
    }
  );
}
