import { useEffect } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
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
}

export function useRotina(user: CurrentUser | null) {
  const queryClient = useQueryClient();

  // Queries
  const { data: members = [] } = useSuspenseQuery({
    queryKey: ["members", user?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role, cargo_principal, email, telefone, user_id, created_at")
        .order("name");

      if (error) throw error;
      return data as unknown as TeamMember[];
    },
    enabled: !!user?.team_id,
  });

  const { data: activities = [] } = useSuspenseQuery({
    queryKey: ["activities", user?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user?.team_id,
  });

  const { data: completions = [] } = useSuspenseQuery({
    queryKey: ["completions", user?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completions")
        .select("*")
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data as Completion[];
    },
    enabled: !!user?.team_id,
  });

  const { data: reschedules = [] } = useSuspenseQuery({
    queryKey: ["reschedules", user?.team_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reschedules")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as Reschedule[];
    },
    enabled: !!user?.team_id,
  });

  // Realtime
  useEffect(() => {
    if (!user?.team_id) return;

    const channels = [
      supabase
        .channel("activities-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activities" },
          () => queryClient.invalidateQueries({ queryKey: ["activities"] })
        )
        .subscribe(),
      supabase
        .channel("completions-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "completions" },
          () => queryClient.invalidateQueries({ queryKey: ["completions"] })
        )
        .subscribe(),
      supabase
        .channel("reschedules-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reschedules" },
          () => queryClient.invalidateQueries({ queryKey: ["reschedules"] })
        )
        .subscribe(),
      supabase
        .channel("members-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "team_members" },
          () => queryClient.invalidateQueries({ queryKey: ["members"] })
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [user?.team_id, queryClient]);

  return {
    members,
    activities,
    completions,
    reschedules,
  };
}
