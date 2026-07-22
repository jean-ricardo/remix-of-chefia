import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
} from "lucide-react";

import appCss from "../styles.css?url";
import chefiaLogoAsset from "@/assets/chefia-logo.png.asset.json";
import { reportLovableError } from "../lib/lovable-error-reporting";

import {
  setMockMemberId,
  setMockRole,
  useMockState,
} from "@/lib/mockUser";
import { useTeamMembers } from "@/lib/useRotina";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <AppShell />
    </QueryClientProvider>
  );
}

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/accept-invite";

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
        <Outlet />
      </main>
      <MobileBottomNav />
      <QaAuthMenu />
    </div>
  );
}

function QaAuthMenu() {
  const items = [
    { to: "/login", label: "Test Login" },
    { to: "/register", label: "Test Register" },
    { to: "/accept-invite", label: "Test Invite" },
  ] as const;
  return (
    <div
      className="fixed bottom-20 right-3 z-50 flex flex-col gap-1 rounded-lg border border-border/70 bg-white/95 p-1.5 shadow-lg backdrop-blur md:bottom-3"
      aria-label="QA Auth Menu"
    >
      <span className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        QA
      </span>
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          className="rounded-md bg-[#042C53] px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-[#185FA5]"
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

function RoleSwitcher() {
  const state = useMockState();
  const members = useTeamMembers();

  const value = state.role === "admin" ? "admin" : `m:${state.memberId ?? ""}`;

  function onChange(v: string) {
    if (v === "admin") {
      setMockRole("admin");
      return;
    }
    if (v.startsWith("m:")) {
      const id = v.slice(2);
      setMockRole("member");
      setMockMemberId(id || null);
    }
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 min-w-[140px] gap-2 border-white/15 bg-white/5 text-navy-foreground",
          "hover:bg-white/10 focus:ring-amber/40",
        )}
        aria-label="Ver como"
      >
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          {state.role === "admin" ? (
            <Shield className="h-3.5 w-3.5 text-amber" />
          ) : (
            <UserCircle2 className="h-3.5 w-3.5 text-amber" />
          )}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="admin">Admin (todas as ações)</SelectItem>
        {(members.data ?? []).map((m) => (
          <SelectItem key={m.id} value={`m:${m.id}`}>
            Membro · {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-navy text-navy-foreground shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
        {/* Logo with generous safe area (equivalent to ring thickness) */}
        <Link to="/" className="flex min-w-0 items-center group p-3 -m-3" aria-label="Chef.IA">
          <span className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 shadow-sm">
            <img
              src={chefiaLogoAsset.url}
              alt="Chef.IA"
              className="h-6 w-auto md:h-7"
            />
          </span>
        </Link>



        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <NavItem to="/">Painel</NavItem>
          <NavItem to="/atividades">Atividades</NavItem>
          <NavItem to="/reprogramadas">Reprogramadas</NavItem>
          <NavItem to="/equipe">Equipe</NavItem>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}


function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="rounded-md px-3 py-1.5 font-medium text-navy-foreground/70 transition-colors hover:bg-white/10 hover:text-navy-foreground [&.active]:bg-white/10 [&.active]:text-amber"
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
