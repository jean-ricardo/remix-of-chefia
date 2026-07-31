import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, LogOut } from "lucide-react";
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
  const { user, session, signOut } = useAuth();
  const metaCode = String(
    (session?.user?.user_metadata as Record<string, unknown> | undefined)
      ?.team_code_pending ?? "",
  );
  const [code, setCode] = useState(metaCode);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(metaCode);
  const [saving, setSaving] = useState(false);

  async function saveCode() {
    const clean = draft.trim();
    if (!clean || saving) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { team_code_pending: clean, status: "pendente" },
    });
    // Espelha o código no perfil pendente (campo de texto livre).
    if (!error && user?.email) {
      await supabase
        .from("team_members")
        .update({ role: `equipe:${clean}` })
        .ilike("email", user.email)
        .eq("cargo_principal", "pendente");
    }
    setSaving(false);
    if (error) {
      toast.error("Não foi possível atualizar o código. Tente novamente.");
      return;
    }
    setCode(clean);
    setEditing(false);
    toast.success("Código da equipe atualizado!");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F6F2] px-5 py-10">
      <Toaster richColors />
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-7 text-center shadow-[0_18px_40px_-28px_rgba(4,44,83,0.45)] ring-1 ring-black/[0.04] sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#185FA5]/10 text-[#185FA5]">
          <Clock3 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-[#042C53] sm:text-2xl">
          Aguardando aprovação do Administrador.
        </h1>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-[#6f6f6a]">
          Cadastro realizado com sucesso! Assim que o Administrador da equipe
          aprovar, suas tarefas ficam liberadas.
        </p>

        <div className="mt-5 rounded-xl bg-[#F7F6F2] p-4 text-left">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b8b86]">
            Código da equipe inserido
          </p>
          {editing ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                placeholder="Cole o código correto"
                className="h-11 w-full rounded-lg border border-[#E0DFDA] bg-white px-3 text-sm text-[#1c1c1a] focus:border-[#185FA5] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveCode()}
                  disabled={saving}
                  className="inline-flex h-11 min-w-[88px] flex-1 items-center justify-center rounded-lg bg-[#D85A30] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c14e28] disabled:opacity-70"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(code);
                    setEditing(false);
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[#E0DFDA] px-4 text-sm font-medium text-[#6f6f6a]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="min-w-0 break-all text-sm font-semibold text-[#042C53]">
                {code || "Não informado"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraft(code);
                  setEditing(true);
                }}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-[#185FA5]/30 px-3 text-xs font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar código
              </button>
            </div>
          )}
        </div>

        {user?.email ? (
          <p className="mt-4 rounded-lg bg-[#F7F6F2] px-3 py-2 text-xs text-[#8b8b86]">
            Conta: <span className="font-medium text-[#042C53]">{user.email}</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#185FA5]/30 px-4 text-sm font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/10"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
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

  if (loading || !session) return <AuthSplash />;

  if (user?.pending) return <PendingApprovalScreen />;

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
