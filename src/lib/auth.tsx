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
 * Single-Tenant RBAC.
 * Only two roles: 'master' and 'membro'.
 */
export type AppRole = "master" | "membro";

export interface CurrentUser {
  /** team_members.id when mapped, otherwise the auth user id. */
  id: string;
  name: string;
  email: string;
  telefone?: string;
  role: AppRole;
  /** Raw value from team_members.cargo_principal. */
  cargo: string | null;
  /** True when the e-mail was found in team_members. */
  mapped: boolean;
  /** UUID from teams table (Single team). */
  team_id: string | null;
}

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: CurrentUser | null;
  signOut: () => Promise<void>;
  /** Forces a refresh of the current user data from the database. */
  refreshUser: () => Promise<void>;
}

export function mapCargoToRole(cargo: unknown): AppRole {
  const c = String(cargo ?? "").trim().toLowerCase();
  if (c === "master" || c === "diretor" || c === "admin") return "master";
  return "membro";
}

/** Tiers with full visibility and edit rights (master). */
export function hasGlobalScope(role: AppRole): boolean {
  return role === "master";
}

/**
 * RBAC action gate for a specific activity.
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
  refreshUser: async () => {},
});

const MAIN_TEAM_ID = "b427d038-be4d-4fb7-b112-b8b6447f3984";

async function resolveCurrentUser(authUser: User): Promise<CurrentUser> {
  const email = (authUser.email ?? "").trim();
  const fallbackName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    "Usuário";

  if (email) {
    // 1. Try to find existing member
    const { data, error } = await supabase
      .from("team_members")
      .select("id,name,email,cargo_principal,telefone,team_id,role")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name || fallbackName,
        email,
        telefone: data.telefone ?? undefined,
        role: (data.role as AppRole) || "membro",
        cargo: data.cargo_principal ?? null,
        mapped: true,
        team_id: data.team_id ?? MAIN_TEAM_ID,
      };
    }

    // 2. Auto-provisioning: first user is master, others are members
    try {
      const { count } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true });

      const isFirst = count === 0;
      const role: AppRole = isFirst ? "master" : "membro";

      const { data: autoMember, error: autoError } = await supabase
        .from("team_members")
        .insert({
          user_id: authUser.id,
          team_id: MAIN_TEAM_ID,
          name: fallbackName,
          email: email,
          cargo_principal: role === "master" ? "Diretor" : "Membro",
          role: role,
          telefone: authUser.user_metadata?.whatsapp || "",
        })
        .select()
        .single();

      if (!autoError && autoMember) {
        return {
          id: autoMember.id,
          name: autoMember.name || fallbackName,
          email,
          telefone: autoMember.telefone ?? undefined,
          role: role,
          cargo: autoMember.cargo_principal,
          mapped: true,
          team_id: MAIN_TEAM_ID,
        };
      }
    } catch (err) {
      console.error("Auto-provisioning error:", err);
    }
  }

  return {
    id: authUser.id,
    name: fallbackName,
    email,
    role: "membro",
    cargo: null,
    mapped: false,
    team_id: MAIN_TEAM_ID,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleUpdate, setRoleUpdate] = useState<{ old: string; new: string } | null>(null);

  const refreshUser = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
    
    if (!currentSession?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const resolved = await resolveCurrentUser(currentSession.user);
    setUser(resolved);
    setLoading(false);
  };

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
          const oldRole = payload.old?.role;
          const newRole = payload.new?.role;

          if (newRole && oldRole !== newRole) {
            setRoleUpdate({
              old: String(oldRole),
              new: String(newRole),
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
      refreshUser,
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
      role: "membro",
      cargo: null,
      mapped: false,
      team_id: MAIN_TEAM_ID,
    }
  );
}
