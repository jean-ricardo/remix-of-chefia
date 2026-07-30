import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
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
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "recovery";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Already authenticated → straight to the dashboard.
  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-[#F7F6F2] lg:grid lg:grid-cols-2">
      <Toaster position="top-right" richColors />

      {/* Branding panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-[#042C53] px-12 py-16 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#185FA5]/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#D85A30]/25 blur-3xl"
        />

        <div className="relative">
          <div className="inline-flex rounded-2xl bg-white/95 p-5 shadow-xl">
            <ChefiaLogo className="h-28 w-auto" />
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            A rotina da sua equipe, sob controle.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Atividades, responsáveis e prazos em um painel em tempo real — com
            histórico de auditoria e permissões por cargo.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-white/85">
            <Benefit icon={<Sparkles className="h-4 w-4" />}>
              Painel Kanban em tempo real
            </Benefit>
            <Benefit icon={<ShieldCheck className="h-4 w-4" />}>
              Permissões por cargo (diretor, adm, membro)
            </Benefit>
            <Benefit icon={<Mail className="h-4 w-4" />}>
              Notificações no WhatsApp da equipe
            </Benefit>
          </ul>
        </div>

        <p className="relative text-xs text-white/45">
          © {new Date().getFullYear()} Chef.IA · Gestão de rotina para equipes
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0 lg:py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <ChefiaLogo className="h-40 w-auto" />
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
            {mode === "recovery" ? (
              <RecoveryForm onBack={() => setMode("signin")} />
            ) : (
              <>
                <ModeTabs mode={mode} onChange={setMode} />
                {mode === "signin" ? (
                  <SignInForm onForgot={() => setMode("recovery")} />
                ) : (
                  <SignUpForm onDone={() => setMode("signin")} />
                )}
              </>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-[#6B6B67] lg:hidden">
            © {new Date().getFullYear()} Chef.IA
          </p>
        </div>
      </main>
    </div>
  );
}

function Benefit({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
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
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#042C53]/5 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={mode === t.id}
          className={cn(
            "min-h-[44px] rounded-lg px-3 text-sm font-semibold transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-1",
            mode === t.id
              ? "bg-white text-[#042C53] shadow-sm"
              : "text-[#444441] hover:text-[#042C53]",
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
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail corporativo" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className="auth-input h-12"
          />
        </Field>

        <Field label="Senha" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="auth-input h-12"
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgot}
            className="rounded text-sm font-medium text-[#185FA5] hover:underline focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2"
          >
            Esqueci minha senha
          </button>
        </div>

        <SubmitButton busy={busy} label="Entrar" busyLabel="Entrando..." />
      </form>
    </>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

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
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
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

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-[#042C53]">Confirme seu e-mail</h1>
        <p className="mt-2 text-sm text-[#444441]">
          Enviamos um link de confirmação. Depois de confirmar, volte e entre com
          sua senha — seu cargo será reconhecido automaticamente.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#042C53]/15 bg-white px-4 text-sm font-semibold text-[#042C53] transition-colors hover:bg-[#042C53]/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Primeiro acesso"
        subtitle="Use o mesmo e-mail cadastrado pela sua empresa — seu cargo e suas atividades serão reconhecidos automaticamente."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail corporativo" htmlFor="su-email">
          <input
            id="su-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className="auth-input h-12"
          />
        </Field>

        <Field label="Crie uma senha" htmlFor="su-password">
          <input
            id="su-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="auth-input h-12"
          />
        </Field>

        <Field label="Confirme a senha" htmlFor="su-confirm">
          <input
            id="su-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            className="auth-input h-12"
          />
        </Field>

        <SubmitButton
          busy={busy}
          label="Criar meu acesso"
          busyLabel="Criando..."
          tone="accent"
        />
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
    // Anti-enumeration: always the same outcome.
    setSent(true);
  }

  return (
    <>
      <Header
        title="Recuperar senha"
        subtitle={
          sent
            ? undefined
            : "Informe seu e-mail corporativo e enviaremos um link para redefinir sua senha."
        }
      />
      {sent ? (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <p className="text-sm text-[#444441]">
            Se o e-mail estiver cadastrado, você receberá um link com as
            instruções em instantes.
          </p>
          <BackButton onClick={onBack} />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail corporativo" htmlFor="rec-email">
            <input
              id="rec-email"
              type="email"
              required
              autoComplete="email"
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="auth-input h-12 disabled:opacity-60"
            />
          </Field>
          <SubmitButton
            busy={busy}
            label="Enviar link de recuperação"
            busyLabel="Enviando..."
            tone="accent"
          />
          <BackButton onClick={onBack} />
        </form>
      )}
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-xl font-bold text-[#042C53] md:text-2xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-[#444441]">{subtitle}</p> : null}
    </div>
  );
}

function SubmitButton({
  busy,
  label,
  busyLabel,
  tone = "primary",
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
  tone?: "primary" | "accent";
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={cn(
        "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
        tone === "primary"
          ? "bg-[#185FA5] hover:bg-[#042C53] focus:ring-[#185FA5]"
          : "bg-[#D85A30] hover:bg-[#c24f2a] focus:ring-[#D85A30]",
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
      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/5 focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao login
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[#042C53]">
        {label}
      </label>
      {children}
    </div>
  );
}
