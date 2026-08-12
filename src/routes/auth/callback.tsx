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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Obter o destino do metadado ou da URL se necessário
        const searchParams = new URLSearchParams(window.location.search);
        const next = searchParams.get("next") || "/";
        navigate({ to: next, replace: true });
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return <AuthSplash label="Finalizando acesso..." />;
}
