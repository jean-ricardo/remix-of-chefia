import { Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Ensures the user is authenticated.
 * Simplified for single-tenant: no pending approval state.
 */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, loading, session, refreshUser } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // No active session -> login
  if (!session) {
    // If we have an auth user but no mapped user, try one last refresh before redirecting
    return <Navigate to="/login" />;
  }

  // Double check if we have a session but no user object yet (and not loading)
  // This helps prevent "white screens" if the session exists but resolveCurrentUser hasn't finished
  if (session && !user && !loading) {
    refreshUser();
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Only allows users with 'master' role.
 */
export function MasterRoute({ children }: { children?: ReactNode }) {
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

  return children ? <>{children}</> : <Outlet />;
}

export function PublicOnlyRoute({ children }: { children?: ReactNode }) {
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

  return children ? <>{children}</> : <Outlet />;
}
