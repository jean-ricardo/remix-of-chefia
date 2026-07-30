import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

/** Chave usada para preservar o ?taskId=... do WhatsApp durante o login. */
export const PENDING_TASK_KEY = "chefia:pendingTaskId";

/** Guarda o taskId da URL atual (se houver) antes de mandar o usuário ao login. */
function stashPendingTaskId() {
  if (typeof window === "undefined") return;
  const taskId = new URLSearchParams(window.location.search).get("taskId");
  if (taskId) window.sessionStorage.setItem(PENDING_TASK_KEY, taskId);
}

/** Lê e limpa o taskId preservado durante o fluxo de login. */
export function consumePendingTaskId(): string | null {
  if (typeof window === "undefined") return null;
  const taskId = window.sessionStorage.getItem(PENDING_TASK_KEY);
  if (taskId) window.sessionStorage.removeItem(PENDING_TASK_KEY);
  return taskId;
}


/** Tela neutra usada enquanto o Supabase confirma a sessão (evita flicker no F5). */
export function AuthSplash({ label = "Carregando" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F6F2]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#185FA5]/25 border-t-[#185FA5]"
        role="status"
        aria-label={label}
      />
    </div>
  );
}

/**
 * Bloqueia a renderização de páginas internas quando não há sessão do Supabase
 * e redireciona para /login. Enquanto a sessão está sendo verificada, mostra a
 * tela neutra em vez de piscar o login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      stashPendingTaskId();
      navigate({ to: "/login", replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || !session) return <AuthSplash />;

  return <>{children}</>;
}

/**
 * Inverso: rotas públicas de autenticação. Usuário já logado é enviado ao
 * painel sem exibir o formulário.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      const pending = consumePendingTaskId();
      navigate({
        to: "/",
        search: pending ? { taskId: pending } : {},
        replace: true,
      });
    }
  }, [loading, session, navigate]);

  if (loading || session) return <AuthSplash label="Verificando sessão" />;

  return <>{children}</>;
}
