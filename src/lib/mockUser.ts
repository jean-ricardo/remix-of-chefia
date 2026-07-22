import { useSyncExternalStore } from "react";
import type { Activity } from "./rotina";

export type MockRole = "admin" | "member";

export interface MockUser {
  id: string;
  name: string;
  role: MockRole;
}

interface MockState {
  role: MockRole;
  memberId: string | null; // impersonated team member when role === "member"
}

const STORAGE_KEY = "mock_user_state_v1";
const listeners = new Set<() => void>();

let state: MockState = (() => {
  if (typeof window === "undefined") return { role: "admin", memberId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
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

export function setMockRole(role: MockRole) {
  state = { ...state, role };
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

function getServerSnapshot(): MockState {
  return { role: "admin", memberId: null };
}

export function useMockState(): MockState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useMockUser(): MockUser {
  const s = useMockState();
  if (s.role === "admin") {
    return { id: "__admin__", name: "Administrador", role: "admin" };
  }
  return {
    id: s.memberId ?? "__member_unassigned__",
    name: "Membro",
    role: "member",
  };
}

/**
 * RBAC: admin can act on all tasks. Members can only act on tasks
 * where they are the assignee or the creator (creator_id may not exist
 * on legacy rows — treated as null, i.e. no match).
 */
export function canActOnActivity(
  user: MockUser,
  activity: Activity & { creator_id?: string | null },
): boolean {
  if (user.role === "admin") return true;
  if (!user.id || user.id.startsWith("__")) return false;
  if (activity.assigned_user_id && activity.assigned_user_id === user.id) return true;
  if (activity.creator_id && activity.creator_id === user.id) return true;
  return false;
}
