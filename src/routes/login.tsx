import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { setMockRole } from "@/lib/mockUser";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Chef.IA" },
      { name: "description", content: "Acesse sua conta corporativa Chef.IA para gerenciar a rotina da sua equipe." },
      { property: "og:title", content: "Entrar — Chef.IA" },
      { property: "og:description", content: "Acesse sua conta corporativa Chef.IA para gerenciar a rotina da sua equipe." },
    ],
  }),
  component: LoginPage,
});

type AuthView = "login" | "recovery";

function LoginPage() {
  const [authView, setAuthView] = useState<AuthView>("login");

  function goToRecovery() {
    setAuthView("recovery");
  }

  function goToLogin() {
    setAuthView("login");
  }

  if (authView === "recovery") {
    return <RecoveryView onBack={goToLogin} />;
  }

  return <LoginView onForgot={goToRecovery} />;
}

function LoginView({ onForgot }: { onForgot: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMockRole("admin");
    navigate({ to: "/" });
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre com sua conta corporativa Chef.IA."
    >
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
            className="auth-input h-11"
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
            className="auth-input h-11"
          />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 text-[#444441]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[#042C53]/30 text-[#185FA5] focus:ring-[#185FA5]"
            />
            Lembrar-me
          </label>
          <button
            type="button"
            onClick={onForgot}
            className="font-medium text-[#185FA5] hover:underline focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2 rounded"
          >
            Esqueci minha senha
          </button>
        </div>

        <button
          type="submit"
          className="min-h-[48px] w-full rounded-xl bg-[#185FA5] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#042C53] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2"
        >
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#444441]">
        Ainda não tem conta?{" "}
        <Link to="/register" className="font-semibold text-[#D85A30] hover:underline">
          Criar Conta Corporativa
        </Link>
      </p>
    </AuthLayout>
  );
}

function RecoveryView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function handleBack() {
    // Reset all recovery state on exit
    setEmail("");
    setIsLoading(false);
    setIsSuccess(false);
    onBack();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    // Structural email validation (HTML5 already enforces, extra safety)
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;

    setIsLoading(true);
    // Mocked flow — no backend call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  }

  return (
    <AuthLayout
      title="Recuperar Senha"
      subtitle={
        isSuccess
          ? undefined
          : "Informe seu e-mail corporativo e enviaremos um link para redefinir sua senha."
      }
    >
      {isSuccess ? (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <p className="text-sm text-[#444441]">
            Se o e-mail estiver cadastrado, você receberá um link com as instruções em instantes.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#042C53]/15 bg-white px-4 py-3 text-sm font-semibold text-[#042C53] transition-colors hover:bg-[#042C53]/5 focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Login
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail corporativo" htmlFor="recovery-email">
            <input
              id="recovery-email"
              type="email"
              required
              autoComplete="email"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="auth-input h-11 disabled:opacity-60"
            />
          </Field>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c24f2a] focus:outline-none focus:ring-2 focus:ring-[#D85A30] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar link de recuperação"
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            disabled={isLoading}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/5 focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2 disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Login
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
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
