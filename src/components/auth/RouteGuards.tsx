import { Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

/**
 * Ensures the user is authenticated.
 * Simplified for single-tenant: no pending approval state.
 */
export function ProtectedRoute() {
  const { user, loading, session } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // No active session -> login
  if (!session) {
    return <Navigate to="/entrar" />;
  }

  // Not mapped to team_members (should be rare due to auto-provisioning)
  if (!user?.mapped) {
    // If auth exists but no team_member, registration logic will handle re-mapping
    // but for now, we just let them through or could redirect to /cadastrar
    return <Outlet />;
  }

  return <Outlet />;
}

/**
 * Only allows users with 'master' role.
 */
export function MasterRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "master") {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}
