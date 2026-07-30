import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ListChecks,
  RotateCw,
  Users,
  Shield,
  UserCircle2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  History as HistoryIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import chefiaLogoAsset from "@/assets/chefia-logo.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";

import { AuthProvider, hasGlobalScope, useAuth, useCurrentUser } from "@/lib/auth";
import { ActivityLogDrawer } from "@/components/logs/ActivityLogDrawer";
import { cn } from "@/lib/utils";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o painel.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o painel
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Rotina da Equipe" },
      {
        name: "description",
        content:
          "Painel em tempo real para gestão da rotina da equipe: atividades diárias, semanais e mensais com prioridade e responsável claros.",
      },
      { property: "og:title", content: "Rotina da Equipe" },
      {
        property: "og:description",
        content: "Painel em tempo real para gestão da rotina da equipe: atividades diárias, semanais e mensais com prioridade e responsável claros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Rotina da Equipe" },
      { name: "twitter:description", content: "Painel em tempo real para gestão da rotina da equipe: atividades diárias, semanais e mensais com prioridade e responsável claros." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6aa92ae4-b26f-4b77-ba63-d190fe2ce391/id-preview-6168e772--4ca07aa6-4085-41b1-b575-23312d5acabc.lovable.app-1783976420681.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6aa92ae4-b26f-4b77-ba63-d190fe2ce391/id-preview-6168e772--4ca07aa6-4085-41b1-b575-23312d5acabc.lovable.app-1783976420681.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const PUBLIC_ROUTES = ["/login"];

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { loading, session } = useAuth();
  const navigate = useNavigate();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !session && !isPublic) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, session, isPublic, navigate]);

  if (isPublic) {
    return <Outlet />;
  }

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F6F2]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#185FA5]/25 border-t-[#185FA5]"
          role="status"
          aria-label="Carregando"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
}

/** Read-only badge showing the role resolved from team_members.cargo_principal. */
function RoleBadge() {
  const user = useCurrentUser();
  const label =
    user.role === "admin" ? "Diretor" : user.role === "gestor" ? "Adm" : "Membro";
  const Icon = hasGlobalScope(user.role) ? Shield : UserCircle2;

  return (
    <span
      className="hidden h-9 items-center gap-2 rounded-lg border border-[#042C53]/15 bg-[#042C53]/5 px-3 text-xs font-semibold text-[#042C53] sm:inline-flex"
      title={user.mapped ? "Cargo definido em Equipe" : "E-mail não vinculado à equipe"}
    >
      <Icon className="h-3.5 w-3.5 text-amber" />
      {label}
    </span>
  );
}



function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setIsScrolled((prev) => {
        if (y > 20 && !prev) return true;
        if (y <= 20 && prev) return false;
        return prev;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 text-[#042C53] transition-all duration-300 ease-in-out",
        isScrolled
          ? "border-b border-gray-200/50 bg-[#F7F6F2]/95 py-2 shadow-sm backdrop-blur-lg"
          : "border-b border-transparent bg-[#F7F6F2]/80 py-4 backdrop-blur-md md:py-5",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center gap-3 px-4 transition-transform duration-300 md:px-8",
          isScrolled && "origin-left scale-[0.97]",
        )}
      >
        {/* Logo with generous safe area (equivalent to ring thickness) */}
        <Link to="/" className="group -m-3 flex min-w-0 items-center p-3" aria-label="Chef.IA">
          <img
            src={chefiaLogoAsset.url}
            alt="Chef.IA"
            className={cn(
              "w-auto transition-all duration-300",
              isScrolled ? "h-[64px] md:h-[72px]" : "h-[94px] md:h-[108px]",
            )}
          />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <NavItem to="/">Painel</NavItem>
          <NavItem to="/atividades">Atividades</NavItem>
          <NavItem to="/reprogramadas">Reprogramadas</NavItem>
          <NavItem to="/equipe">Equipe</NavItem>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <HistoryButton />
          <RoleBadge />
          <UserMenu />
        </div>

      </div>
    </header>
  );
}

/** Opens the realtime audit feed. Visible to diretor/adm only. */
function HistoryButton() {
  const [open, setOpen] = useState(false);
  const user = useCurrentUser();
  if (!hasGlobalScope(user.role)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir histórico de ações"
        className="grid h-11 w-11 place-items-center rounded-lg text-[#042C53] transition-colors hover:bg-[#185FA5]/10 hover:text-[#185FA5]"
      >
        <HistoryIcon className="h-5 w-5" />
      </button>
      <ActivityLogDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}


function UserMenu() {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const initials = (user?.name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#042C53]/10 bg-white px-2 text-[#042C53] transition-colors hover:bg-[#042C53]/5 focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40"
        aria-label="Menu do usuário"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#185FA5]/10 text-xs font-semibold text-[#185FA5]">
          {initials}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
          {user?.name || "Usuário"}
        </span>
        <ChevronDown className="h-4 w-4 text-[#042C53]/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[#042C53]">
          {user?.name || "Usuário"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/perfil" })}
          className="min-h-11 cursor-pointer gap-2 text-sm"
        >
          <UserIcon className="h-4 w-4" />
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleLogout}
          className="min-h-11 cursor-pointer gap-2 text-sm text-[#D85A30] focus:text-[#D85A30]"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}



function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="rounded-md px-3 py-1.5 font-medium text-[#042C53]/70 transition-colors hover:bg-[#042C53]/5 hover:text-[#042C53] [&.active]:bg-[#042C53]/10 [&.active]:text-[#042C53]"
    >
      {children}
    </Link>
  );
}

function MobileBottomNav() {
  const items = [
    { to: "/", label: "Painel", icon: LayoutDashboard },
    { to: "/atividades", label: "Atividades", icon: ListChecks },
    { to: "/reprogramadas", label: "Reprog.", icon: RotateCw },
    { to: "/equipe", label: "Equipe", icon: Users },
  ] as const;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)] md:hidden",
      )}
      aria-label="Navegação principal"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                activeOptions={{ exact: true }}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors",
                  "[&.active]:text-navy",
                )}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                        isActive ? "bg-amber/25 text-navy" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className={cn(isActive && "text-navy font-semibold")}>
                      {it.label}
                    </span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
