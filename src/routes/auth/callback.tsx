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
      console.log("AuthCallbackPage: Initing check...");
      
      // 1. Manually check if there's a session (Supabase handles hash automatically)
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("AuthCallbackPage: Session error", error);
      }

      if (data.session) {
        console.log("AuthCallbackPage: Session found, redirecting...");
        const searchParams = new URLSearchParams(window.location.search);
        const next = searchParams.get("next") || "/";
        navigate({ to: next, replace: true });
        return;
      }

      // 2. Set up listener if not found immediately
      console.log("AuthCallbackPage: No session yet, listening for state change...");
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("AuthCallbackPage: Auth event:", event);
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
          const searchParams = new URLSearchParams(window.location.search);
          const next = searchParams.get("next") || "/";
          navigate({ to: next, replace: true });
        }
      });

      // 3. Safety timeout: if nothing happens in 5 seconds, go home
      const timer = setTimeout(() => {
        console.log("AuthCallbackPage: Timeout reached, checking session one last time...");
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            console.log("AuthCallbackPage: Still no session, navigating to home.");
            navigate({ to: "/", replace: true });
          }
        });
      }, 5000);

      return () => {
        sub.subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    handleAuth();
  }, [navigate]);

  return <AuthSplash label="Finalizando acesso..." />;
}
