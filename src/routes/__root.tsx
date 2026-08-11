import { useEffect, useState } from "react";
import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import {
  LogOut,
  User,
  LayoutDashboard,
  ClipboardList,
  History,
  Users,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ChefiaLogo } from "@/components/brand/ChefiaLogo";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { user, signOut, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const isPublicRoute = ["/login", "/cadastrar", "/cadastrar-empresa"].includes(
    location.pathname,
  );

  if (loading && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F2]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#185FA5] border-t-transparent"></div>
          <p className="text-sm font-medium text-[#042C53]">Carregando plataforma...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      roles: ["master", "membro"],
    },
    {
      label: "Minhas Tarefas",
      path: "/atividades",
      icon: ClipboardList,
      roles: ["master", "membro"],
    },
    {
      label: "Atrasadas",
      path: "/atrasadas",
      icon: CalendarDays,
      roles: ["master", "membro"],
    },
    {
      label: "Reprogramadas",
      path: "/reprogramadas",
      icon: CalendarDays,
      roles: ["master", "membro"],
    },
    {
      label: "Histórico",
      path: "/historico",
      icon: History,
      roles: ["master", "membro"],
    },
    {
      label: "Equipe",
      path: "/equipe",
      icon: Users,
      roles: ["master"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || "membro"),
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2]">
      <Toaster richColors position="top-center" />

      {session && !isPublicRoute ? (
        <>
          {/* Header */}
          <header className="sticky top-0 z-40 w-full border-b border-black/[0.04] bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-[#6f6f6a] hover:bg-black/[0.02] hover:text-[#042C53] lg:hidden"
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
                <Link to="/" className="flex items-center gap-2">
                  <ChefiaLogo className="h-8 w-auto" />
                </Link>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  <span className="text-sm font-semibold text-[#042C53]">
                    {user?.name}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#9a9a95]">
                    {user?.role === "master" ? "Master" : "Membro"}
                  </span>
                </div>
                <div className="h-8 w-[1px] bg-black/[0.06] hidden sm:block" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: "/perfil" })}
                  className="text-[#6f6f6a] hover:bg-black/[0.02] hover:text-[#042C53]"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="text-[#6f6f6a] hover:bg-black/[0.02] hover:text-[#D85A30]"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-7xl flex-1 items-start gap-0 sm:gap-8 sm:px-6 lg:px-8">
            {/* Desktop Sidebar */}
            <aside className="sticky top-16 hidden w-64 shrink-0 py-8 lg:block">
              <nav className="space-y-1">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                      location.pathname === item.path
                        ? "bg-[#185FA5] text-white shadow-lg shadow-[#185FA5]/20"
                        : "text-[#6f6f6a] hover:bg-black/[0.02] hover:text-[#042C53]",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}

            {/* Mobile Sidebar */}
            <aside
              className={cn(
                "fixed bottom-0 left-0 top-16 z-40 w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <div className="flex h-full flex-col p-6">
                <div className="mb-8 flex items-center gap-3 px-2 sm:hidden">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#042C53]">
                      {user?.name}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#9a9a95]">
                      {user?.role === "master" ? "Master" : "Membro"}
                    </span>
                  </div>
                </div>
                <nav className="flex-1 space-y-1">
                  {filteredNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        location.pathname === item.path
                          ? "bg-[#185FA5] text-white"
                          : "text-[#6f6f6a] hover:bg-black/[0.02] hover:text-[#042C53]",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="w-full flex-1 py-4 sm:py-8">
              <Outlet />
            </main>
          </div>
        </>
      ) : (
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      )}
    </div>
  );
}
