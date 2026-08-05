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
import { useEffect, type ReactNode } from "react";
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
  ScrollText,
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
import { ProtectedRoute } from "@/components/auth/RouteGuards";

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

const PUBLIC_ROUTES = ["/login", "/cadastrar"];

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const navigate = useNavigate();

  // Deep link global (?taskId=... vindo do WhatsApp): sempre resolve no painel.
  useEffect(() => {
    if (isPublic || pathname === "/" || typeof window === "undefined") return;
    const taskId = new URLSearchParams(window.location.search).get("taskId");
    if (taskId) {
      navigate({ to: "/", search: { taskId }, replace: true });
    }
  }, [pathname, isPublic, navigate]);

  if (isPublic) {
    return <Outlet />;
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex w-full flex-1 flex-col pb-8">
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 md:px-8 md:pt-8">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </ProtectedRoute>
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
  return (
    <header
      className={cn(
        // Altura fixa e estilo 100% CSS (sem listeners de scroll)
        "sticky top-0 z-40 w-full border-b bg-background/95 shadow-sm backdrop-blur-md transition-shadow",
        "h-[76px] text-[#042C53] md:h-[88px]",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 md:px-8">
        {/* Logo with generous safe area (equivalent to ring thickness) */}
        <Link to="/" className="group -m-3 flex min-w-0 items-center p-3" aria-label="Chef.IA">
          <img
            src={chefiaLogoAsset.url}
            alt="Chef.IA"
            className="h-[60px] w-auto md:h-[72px]"
          />
        </Link>



        <MainNav />

        <div className="ml-auto flex items-center gap-2">
          <RoleBadge />
          <UserMenu />
        </div>

      </div>
    </header>
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




/** Navegação principal (desktop). Histórico só para diretor/adm. */
function MainNav() {
  const { loading } = useAuth();
  const user = useCurrentUser();
  const canSeeHistory = !loading && hasGlobalScope(user.role);

  return (
    <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
      <NavItem to="/">Painel</NavItem>
      <NavItem to="/atividades">Atividades</NavItem>
      <NavItem to="/reprogramadas">Reprogramadas</NavItem>
      {canSeeHistory ? <NavItem to="/historico">Histórico</NavItem> : null}
      <NavItem to="/equipe">Equipe</NavItem>
    </nav>
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
  const { loading } = useAuth();
  const user = useCurrentUser();
  const canSeeHistory = !loading && hasGlobalScope(user.role);

  const items = [
    { to: "/", label: "Painel", icon: LayoutDashboard },
    { to: "/atividades", label: "Atividades", icon: ListChecks },
    { to: "/reprogramadas", label: "Reprog.", icon: RotateCw },
    ...(canSeeHistory
      ? [{ to: "/historico", label: "Histórico", icon: ScrollText }]
      : []),
    { to: "/equipe", label: "Equipe", icon: Users },
  ];

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
