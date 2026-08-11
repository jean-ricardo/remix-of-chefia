import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import type { Activity, Completion, Reschedule, TeamMember } from "./rotina";

const KEYS = {
  members: ["team_members"] as const,
  activities: ["activities"] as const,
  completions: ["completions"] as const,
  reschedules: ["reschedules"] as const,
};

export function useTeamMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEYS.members, user?.team_id],
    queryFn: async () => {
      let query = supabase
        .from("team_members")
        .select("id,name,role,telefone,cargo_principal,team_id,status")
        .or("cargo_principal.is.null,cargo_principal.neq.pendente")
        .order("name");

      if (user?.team_id) {
        query = query.eq("team_id", user.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: !!user,
  });
}

export function useActivities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [KEYS.activities, user?.team_id],
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select("id,title,assigned_user_id,priority,recurrence_type,weekday,month_day,due_date,recurrence,description,status,created_by,team_id")
        .order("created_at", { ascending: false });

      if (user?.team_id) {
        query = query.eq("team_id", user.team_id);
      }

      const { data, error } = await query;
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
        .select("activity_id,occurrence_key,completed_at");
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
        .select("id,activity_id,original_occurrence_key,new_date,justification,created_at");
      if (error) throw error;
      return (data ?? []) as Reschedule[];
    },
  });
}

/**
 * Subscribes to realtime changes for all rotina tables and invalidates queries.
 * Also refreshes every 60s so date-based statuses update automatically.
 */
export function useRotinaRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("rotina")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        qc.invalidateQueries({ queryKey: KEYS.members });
        qc.invalidateQueries({ queryKey: ["team_members", "pending"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.activities }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "completions" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.completions }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reschedules" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.reschedules }),
      )
      .subscribe();

    const interval = setInterval(() => {
      // Force re-render for date-based recalculation
      qc.invalidateQueries({ queryKey: KEYS.activities });
      qc.invalidateQueries({ queryKey: KEYS.completions });
      qc.invalidateQueries({ queryKey: KEYS.reschedules });
    }, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [qc]);
}
