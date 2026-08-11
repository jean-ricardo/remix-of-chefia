import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Activity, Completion, Reschedule } from "./rotina";
import type { CurrentUser } from "./auth";

export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  cargo_principal: string | null;
  email: string | null;
  telefone: string | null;
  user_id: string | null;
  created_at: string;
  team_id?: string | null;
}

const KEYS = {
  members: ["members"] as const,
  activities: ["activities"] as const,
  completions: ["completions"] as const,
  reschedules: ["reschedules"] as const,
};

export function useTeamMembers() {
  const { user } = (require("./auth") as { useAuth: () => { user: CurrentUser | null } }).useAuth();
  return useQuery({
    queryKey: [KEYS.members, user?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role, cargo_principal, email, telefone, user_id, created_at, team_id")
        .order("name");

      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: !!user,
  });
}

export function useActivities() {
  const { user } = (require("./auth") as { useAuth: () => { user: CurrentUser | null } }).useAuth();
  return useQuery({
    queryKey: [KEYS.activities, user?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Activity[];
    },
    enabled: !!user,
  });
}

export function useCompletions() {
  return useQuery({
    queryKey: KEYS.completions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completions")
        .select("*")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Completion[];
    },
  });
}

export function useReschedules() {
  return useQuery({
    queryKey: KEYS.reschedules,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reschedules")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Reschedule[];
    },
  });
}

export function useRotinaRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("rotina-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.members })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.activities })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "completions" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.completions })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reschedules" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.reschedules })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

// Keep the bulk hook for backward compatibility if any file still uses it
export function useRotina(user: CurrentUser | null) {
  const members = useTeamMembers();
  const activities = useActivities();
  const completions = useCompletions();
  const reschedules = useReschedules();
  useRotinaRealtime();

  return {
    members: members.data ?? [],
    activities: activities.data ?? [],
    completions: completions.data ?? [],
    reschedules: reschedules.data ?? [],
  };
}
