import { useSyncExternalStore } from "react";
import type { Activity } from "./rotina";

/**
 * 3-Tier RBAC:
 *  - admin   → full global access, all edits
 *  - gestor  → full global visibility on the board, full edits (manager)
 *  - usuario → strict scope: only tasks assigned to them; limited edits
 *              (status + reschedule only; title/description/assignee locked)
 *
 * Legacy value "member" is normalized to "usuario" automatically.
 */
export type MockRole = "admin" | "gestor" | "usuario";
export type MockRoleInput = MockRole | "member" | (string & {});

export interface MockUser {
  id: string;
  name: string;
  role: MockRole;
}

interface MockState {
  role: MockRole;
  memberId: string | null; // impersonated team member when role !== "admin"
}

const STORAGE_KEY = "mock_user_state_v1";
const listeners = new Set<() => void>();

export function normalizeRole(r: unknown): MockRole {
  if (r === "admin") return "admin";
  if (r === "gestor" || r === "diretor" || r === "director") return "gestor";
  // "member", unknown, undefined → deny-by-default lowest tier
  return "usuario";
}

let state: MockState = (() => {
  if (typeof window === "undefined") return { role: "admin", memberId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { role?: unknown; memberId?: string | null };
      return {
        role: normalizeRole(parsed.role),
        memberId: parsed.memberId ?? null,
      };
    }
  } catch {
    /* noop */
  }
  return { role: "admin", memberId: null };
})();

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* noop */
    }
  }
  listeners.forEach((l) => l());
}

export function setMockRole(role: MockRoleInput) {
  state = { ...state, role: normalizeRole(role) };
  persist();
}

export function setMockMemberId(memberId: string | null) {
  state = { ...state, memberId };
  persist();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return state;
}

const SERVER_SNAPSHOT: MockState = { role: "admin", memberId: null };
function getServerSnapshot(): MockState {
  return SERVER_SNAPSHOT;
}

export function useMockState(): MockState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useMockUser(): MockUser {
  const s = useMockState();
  if (s.role === "admin") {
    return { id: "__admin__", name: "Administrador", role: "admin" };
  }
  if (s.role === "gestor") {
    return {
      id: s.memberId ?? "__gestor_unassigned__",
      name: "Gestor",
      role: "gestor",
    };
  }
  return {
    id: s.memberId ?? "__usuario_unassigned__",
    name: "Usuário",
    role: "usuario",
  };
}

/** True for tiers that see & edit everything (admin + gestor). */
export function hasGlobalScope(role: MockRole): boolean {
  return role === "admin" || role === "gestor";
}

/**
 * RBAC action gate for a specific activity.
 * - admin/gestor: allowed on everything.
 * - usuario: only if they are the assignee (or legacy creator match).
 */
export function canActOnActivity(
  user: MockUser,
  activity: Activity & { creator_id?: string | null; assignee_id?: string | null },
): boolean {
  if (hasGlobalScope(user.role)) return true;
  if (!user.id || user.id.startsWith("__")) return false;
  const assignee = activity.assigned_user_id ?? activity.assignee_id ?? null;
  if (assignee && assignee === user.id) return true;
  if (activity.creator_id && activity.creator_id === user.id) return true;
  return false;
}
