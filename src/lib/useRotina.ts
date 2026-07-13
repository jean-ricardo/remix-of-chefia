import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Activity, Completion, Reschedule, TeamMember } from "./rotina";

const KEYS = {
  members: ["team_members"] as const,
  activities: ["activities"] as const,
  completions: ["completions"] as const,
  reschedules: ["reschedules"] as const,
};

export function useTeamMembers() {
  return useQuery({
    queryKey: KEYS.members,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id,name,role")
        .order("name");
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

export function useActivities() {
  return useQuery({
    queryKey: KEYS.activities,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,title,assigned_user_id,priority,recurrence_type,weekday,month_day,due_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });
}

export function useCompletions() {
  return useQuery({
    queryKey: KEYS.completions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completions")
        .select("activity_id,occurrence_key");
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
        .select("activity_id,original_occurrence_key,new_date");
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
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () =>
        qc.invalidateQueries({ queryKey: KEYS.members }),
      )
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
