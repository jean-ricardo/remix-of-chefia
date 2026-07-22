import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { setMockRole } from "@/lib/mockUser";
import { AuthLayout } from "@/components/auth/AuthLayout";

const MOCK_COMPANY = "Chef Cozinhas Ltda.";
const MOCK_EMAIL = "convidado@empresa.com";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({
    meta: [
      { title: "Aceitar Convite — Chef.IA" },
      { name: "description", content: `Você foi convidado para a equipe ${MOCK_COMPANY} no Chef.IA.` },
      { property: "og:title", content: "Aceitar Convite — Chef.IA" },
      { property: "og:description", content: `Você foi convidado para a equipe ${MOCK_COMPANY} no Chef.IA.` },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMockRole("admin");
    navigate({ to: "/" });
  }

  return (
    <AuthLayout
      title={`Você foi convidado para a equipe ${MOCK_COMPANY}`}
      subtitle="Complete seu cadastro para acessar o painel da equipe."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" htmlFor="email">
          <input
            id="email"
            type="email"
            value={MOCK_EMAIL}
            readOnly
            disabled
            className="auth-input cursor-not-allowed bg-[#EFEEE8] text-[#6B6B67]"
          />
        </Field>

        <Field label="Seu Nome" htmlFor="name">
          <input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como devemos te chamar?"
            className="auth-input"
          />
        </Field>

        <Field label="Crie uma Senha" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="auth-input"
          />
        </Field>

        <button
          type="submit"
          className="min-h-[48px] w-full rounded-xl bg-[#185FA5] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#042C53] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2"
        >
          Aceitar Convite e Entrar
        </button>
      </form>
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
