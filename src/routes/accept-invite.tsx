import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
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
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMockRole("member");
    navigate({ to: "/" });
  }

  return (
    <AuthLayout
      title="Você foi convidado para o Chef.IA"
      subtitle={`Complete seu cadastro para acessar a equipe ${MOCK_COMPANY}.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Empresa" htmlFor="company">
          <LockedInput id="company" value={MOCK_COMPANY} />
        </Field>

        <Field label="E-mail" htmlFor="email">
          <LockedInput id="email" type="email" value={MOCK_EMAIL} />
        </Field>

        <Field label="Nome Completo" htmlFor="name">
          <input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como devemos te chamar?"
            className="auth-input focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
          />
        </Field>

        <Field label="Cargo / Função" htmlFor="jobTitle">
          <input
            id="jobTitle"
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Ex.: Chef de Cozinha"
            className="auth-input focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
          />
        </Field>

        <Field label="Crie sua Senha" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="auth-input focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
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

function LockedInput({
  id,
  value,
  type = "text",
}: {
  id: string;
  value: string;
  type?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        readOnly
        disabled
        className="auth-input cursor-not-allowed bg-gray-100 pr-10 text-gray-500"
      />
      <Lock
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      />
    </div>
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
