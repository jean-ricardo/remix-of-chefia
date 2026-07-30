import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, BellRing, KanbanSquare, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChefiaLogo } from "@/components/brand/ChefiaLogo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Chef.IA" },
      {
        name: "description",
        content:
          "Acesse sua conta corporativa Chef.IA para gerenciar a rotina da sua equipe em tempo real.",
      },
      { property: "og:title", content: "Entrar — Chef.IA" },
      {
        property: "og:description",
        content:
          "Acesse sua conta corporativa Chef.IA para gerenciar a rotina da sua equipe em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "recovery";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans md:flex-row">
      <Toaster position="top-right" richColors />

      {/* Content panel — desktop only */}
      <aside className="relative hidden w-full overflow-hidden px-14 py-16 md:flex md:w-1/2 md:flex-col md:justify-between">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(145deg, #FFFFFF 0%, #F7F6F2 35%, #E8F1F8 70%, #FDF8F3 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-[#185FA5]/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-28 h-[28rem] w-[28rem] rounded-full bg-[#D85A30]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/3 top-1/2 h-[20rem] w-[20rem] -translate-y-1/2 rounded-full bg-[#185FA5]/6 blur-3xl"
        />

        <div className="relative">
          <ChefiaLogo className="h-28 w-auto" />
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-[2.6rem] font-semibold leading-[1.1] tracking-tight text-[#042C53]">
            A rotina da sua equipe,
            <br />
            sob controle.
          </h2>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-[#444441]">
            Atividades, responsáveis e prazos organizados em um painel dinâmico. Controle total da sua operação com histórico de auditoria e permissões avançadas.
          </p>

          <ul className="mt-12 space-y-6">
            <Benefit icon={<KanbanSquare className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
              Painel Kanban em tempo real
            </Benefit>
            <Benefit icon={<ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
              Permissões por cargo (diretor, adm, membro)
            </Benefit>
            <Benefit icon={<BellRing className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
              Notificações no WhatsApp da equipe
            </Benefit>
          </ul>
        </div>

        <p className="relative text-xs tracking-wide text-[#6B6B67]">
          © {new Date().getFullYear()} Chef.IA · Gestão de rotina para equipes
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col justify-center bg-white px-6 py-10 sm:px-12 md:w-1/2 md:px-16">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-10 flex justify-center md:hidden">
            <ChefiaLogo className="h-28 w-auto" />
          </div>

          {mode === "recovery" ? (
            <RecoveryForm onBack={() => setMode("signin")} />
          ) : (
            <>
              <ModeTabs mode={mode} onChange={setMode} />
              {mode === "signin" ? (
                <SignInForm onForgot={() => setMode("recovery")} />
              ) : (
                <SignUpForm />
              )}
            </>
          )}

          <p className="mt-12 text-center text-[11px] text-[#9a9a95] md:hidden">
            © {new Date().getFullYear()} Chef.IA
          </p>
        </div>
      </main>
    </div>
  );
}

function Benefit({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-4 text-[0.95rem] text-white/80">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/90 backdrop-blur-sm">
        {icon}
      </span>
      {children}
    </li>
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tabs = [
    { id: "signin" as const, label: "Entrar" },
    { id: "signup" as const, label: "Primeiro acesso" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Modo de acesso"
      className="mb-10 flex border-b border-[#E6E5E0]"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={mode === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative -mb-px min-h-[44px] flex-1 px-2 pb-3 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#185FA5]/40 focus-visible:ring-offset-2",
            mode === t.id
              ? "text-[#042C53] after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-[#185FA5]"
              : "text-[#8b8b86] hover:text-[#444441]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já possui conta. Use a aba “Entrar”.";
  if (m.includes("password")) return "Senha inválida — use ao menos 8 caracteres.";
  return "Não foi possível concluir. Tente novamente.";
}

/** Material-style underline input with floating focus feedback. */
function MaterialInput({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className="group relative pt-5">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b8b86] transition-colors group-focus-within:text-[#185FA5]"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={cn(
          "peer h-12 w-full border-0 border-b border-[#E0DFDA] bg-transparent px-0 text-[15px] text-[#1c1c1a]",
          "placeholder:text-[#b9b8b2] focus:outline-none focus:ring-0",
          "transition-colors disabled:opacity-60",
          props.className,
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-[#185FA5] transition-transform duration-200 peer-focus:scale-x-100"
      />
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/", replace: true });
  }

  return (
    <>
      <Header
        title="Bem-vindo de volta"
        subtitle="Entre com sua conta corporativa Chef.IA."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <MaterialInput
          id="email"
          label="E-mail corporativo"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@empresa.com"
        />

        <MaterialInput
          id="password"
          label="Senha"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onForgot}
            className="rounded text-[13px] font-medium text-[#185FA5] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#185FA5]/40 focus-visible:ring-offset-2"
          >
            Esqueci minha senha
          </button>
        </div>

        <SubmitButton busy={busy} label="Entrar" busyLabel="Entrando..." />
      </form>
    </>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      toast.warning("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.warning("As senhas não conferem.");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);

    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }

    if (data.session) {
      toast.success("Conta criada! Acesso liberado.");
      navigate({ to: "/", replace: true });
      return;
    }

    toast.success(
      "Enviamos um link de confirmação para seu e-mail. Ao confirmar, você entra direto no painel.",
    );
  }

  return (
    <>
      <Header
        title="Primeiro acesso"
        subtitle="Use o mesmo e-mail cadastrado pela sua empresa — seu cargo será reconhecido automaticamente."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <MaterialInput
          id="su-email"
          label="E-mail corporativo"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@empresa.com"
        />

        <MaterialInput
          id="su-password"
          label="Crie uma senha"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />

        <MaterialInput
          id="su-confirm"
          label="Confirme a senha"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a senha"
        />

        <SubmitButton busy={busy} label="Criar meu acesso" busyLabel="Criando..." />
      </form>
    </>
  );
}

function RecoveryForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <>
      <Header
        title="Recuperar senha"
        subtitle={
          sent
            ? "Se o e-mail estiver cadastrado, você receberá um link com as instruções em instantes."
            : "Informe seu e-mail corporativo e enviaremos um link para redefinir sua senha."
        }
      />
      {sent ? (
        <BackButton onClick={onBack} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <MaterialInput
            id="rec-email"
            label="E-mail corporativo"
            type="email"
            required
            autoComplete="email"
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
          />
          <SubmitButton
            busy={busy}
            label="Enviar link de recuperação"
            busyLabel="Enviando..."
          />
          <BackButton onClick={onBack} />
        </form>
      )}
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[#0F1B2B]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-[0.9rem] leading-relaxed text-[#6f6f6a]">{subtitle}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  busy,
  label,
  busyLabel,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={cn(
        "mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-4",
        "bg-[#B4471F] text-[15px] font-semibold text-white",
        "shadow-[0_10px_24px_-12px_rgba(180,71,31,0.75)] transition-all",
        "hover:bg-[#9c3d1a] hover:shadow-[0_14px_28px_-12px_rgba(180,71,31,0.85)] active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4471F]/40 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-70",
      )}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {busyLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#185FA5]/40 focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao login
    </button>
  );
}
