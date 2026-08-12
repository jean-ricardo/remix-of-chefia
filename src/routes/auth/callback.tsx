import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthSplash } from "@/components/auth/RouteGuards";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleAuth() {
      // 1. First, check if there is an access_token in the hash (standard Supabase invite flow)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        // Supabase JS client automatically handles hash fragments on initialize/refresh,
        // but for invite flows, we might need to wait for the session or explicitly refresh.
        const { data, error } = await supabase.auth.getSession();
        if (data.session) {
          const searchParams = new URLSearchParams(window.location.search);
          const next = searchParams.get("next") || "/";
          navigate({ to: next, replace: true });
          return;
        }
      }

      // 2. Fallback to event listener for other flows
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
          const searchParams = new URLSearchParams(window.location.search);
          const next = searchParams.get("next") || "/";
          navigate({ to: next, replace: true });
        }
      });

      return () => {
        sub.subscription.unsubscribe();
      };
    }

    handleAuth();
  }, [navigate]);

  return <AuthSplash label="Finalizando acesso..." />;
}
