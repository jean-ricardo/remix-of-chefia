import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  actor_name: string;
  action_type: string;
  details: string;
  task_id: string | null;
  team_id: string | null;
  created_at: string;
}

export const ACTIVITY_LOGS_KEY = ["activity_logs"] as const;

export type LogActionType = "create" | "update" | "delete" | "status" | "reschedule";

export const ACTION_LABEL: Record<string, string> = {
  create: "criou a atividade",
  update: "editou a atividade",
  delete: "excluiu a atividade",
  status: "alterou o status",
  reschedule: "reprogramou a atividade",
};

/**
 * Fire-and-forget audit trail write. Never blocks or breaks the main mutation.
 */
export async function logActivity(input: {
  actorName: string;
  actionType: LogActionType;
  details: string;
  taskId?: string | null;
  teamId?: string | null;
}) {
  try {
    await supabase.from("activity_logs").insert({
      actor_name: input.actorName,
      action_type: input.actionType,
      details: input.details,
      task_id: input.taskId ?? null,
      team_id: input.teamId ?? null,
    });
  } catch (e) {
    console.error("[activity_logs] insert failed", e);
  }
}

export function useActivityLogs(enabled = true, teamId: string | null = null) {
  return useQuery({
    queryKey: ACTIVITY_LOGS_KEY,
    enabled,
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("id,actor_name,action_type,details,task_id,team_id,created_at");

      if (teamId) {
        query = query.eq("team_id", teamId);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as ActivityLog[];
    },
  });
}

/** Realtime subscription for the audit feed. */
export function useActivityLogsRealtime(enabled = true, teamId: string | null = null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("activity_logs_feed")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "activity_logs",
          filter: teamId ? `team_id=eq.${teamId}` : undefined
        },
        () => qc.invalidateQueries({ queryKey: ACTIVITY_LOGS_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, enabled]);
}
