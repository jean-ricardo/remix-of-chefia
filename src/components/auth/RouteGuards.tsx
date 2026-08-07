import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
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
/**
 * Sala de espera: novos cadastros ficam sem navegação até um Adm/Diretor
 * aprovar o vínculo com a equipe.
 */
export function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isRemoved = new URLSearchParams(window.location.search).get("reason") === "removed";

  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F6F2] px-5 py-10">
      <Toaster richColors />
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-7 text-center shadow-[0_18px_40px_-28px_rgba(4,44,83,0.45)] ring-1 ring-black/[0.04] sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#185FA5]/10 text-[#185FA5]">
          <Clock3 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-[#042C53] sm:text-2xl">
          {isRemoved ? "Acesso Revogado" : "Aguardando Aprovação"}
        </h1>
        <div className="mt-3 text-[0.92rem] leading-relaxed text-[#6f6f6a]">
          {isRemoved ? (
            <div className="space-y-3">
              <p>Esta conta foi removida da equipe e não possui mais acesso à plataforma.</p>
              <p className="font-medium text-[#185FA5]">
                Para retornar, você precisará de um novo link de convite e realizar um novo cadastro utilizando o código da equipe.
              </p>
            </div>
          ) : (
            "O seu pedido de acesso está sendo analisado pelo Administrador da equipe. Por favor, aguarde a liberação para acessar o painel."
          )}
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-[#185FA5]/30 px-4 text-sm font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/10"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        {user?.email ? (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg bg-[#F7F6F2] px-3 py-2 text-xs text-[#8b8b86]">
              Conta: <span className="font-medium text-[#042C53]">{user.email}</span>
            </p>
            
            {!isRemoved && !user.mapped && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    stashPendingTaskId();
                    window.location.href = "/cadastrar-empresa";
                  }}
                  className="flex h-10 items-center justify-center rounded-lg bg-[#D85A30] px-4 text-[13px] font-semibold text-white transition-all hover:bg-[#c14e28]"
                >
                  Criar minha base (Diretor)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stashPendingTaskId();
                    window.location.href = "/cadastrar";
                  }}
                  className="flex h-10 items-center justify-center rounded-lg border border-[#D85A30]/30 px-4 text-[13px] font-semibold text-[#D85A30] transition-all hover:bg-[#D85A30]/5"
                >
                  Entrar em uma equipe
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}


export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, session, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      stashPendingTaskId();
      navigate({ to: "/login", replace: true });
    }
  }, [loading, session, navigate]);

  if (loading) return <AuthSplash />;
  if (!session) return null; // Redirecionamento em curso no useEffect

  if (user?.pending) return <PendingApprovalScreen />;

  // Se o usuário está logado mas NÃO tem vínculo com nenhuma equipe, 
  // nós permitimos que ele acesse a página de cadastro de empresa ou cadastro de membro
  // em vez de bloqueá-lo na sala de espera.
  const isAuthRoute = window.location.pathname === "/cadastrar" || window.location.pathname === "/cadastrar-empresa";
  
  // Se o usuário está logado mas não mapeado, e não está nas rotas de cadastro, 
  // nós permitimos que ele veja as rotas de cadastro se clicar em links ou for redirecionado.
  if (!user?.mapped && !isAuthRoute) {
    return <PendingApprovalScreen />;
  }

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
