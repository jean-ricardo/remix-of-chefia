import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

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
      navigate({ to: "/", replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || session) return <AuthSplash label="Verificando sessão" />;

  return <>{children}</>;
}
