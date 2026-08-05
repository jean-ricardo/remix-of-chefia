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
  if (c === "diretor" || c === "director" || c === "admin") return "admin";
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
    const { data, error } = await supabase
      .from("team_members")
      .select("id,name,email,cargo_principal,telefone")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name || fallbackName,
        email,
        role: mapCargoToRole(data.cargo_principal),
        cargo: data.cargo_principal ?? null,
        mapped: true,
        pending: isPendingCargo(data.cargo_principal),
      };
    }
  }

  return {
    id: authUser.id,
    name: fallbackName,
    email,
    role: "usuario",
    cargo: null,
    mapped: false,
    pending: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      void apply(next ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
    }
  );
}
