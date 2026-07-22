import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
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

function LoginPage() {
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
            className="auth-input"
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
            className="auth-input"
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
          <a href="#" className="font-medium text-[#185FA5] hover:underline">
            Esqueci minha senha
          </a>
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
