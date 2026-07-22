import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useMockUser } from "@/lib/mockUser";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Chef.IA" },
      {
        name: "description",
        content:
          "Gerencie suas informações pessoais e segurança na sua conta Chef.IA.",
      },
      { property: "og:title", content: "Meu Perfil — Chef.IA" },
      {
        property: "og:description",
        content:
          "Gerencie suas informações pessoais e segurança na sua conta Chef.IA.",
      },
    ],
  }),
  component: PerfilPage,
});

function initialsOf(name: string | undefined) {
  const n = (name || "Usuário").trim();
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

function PerfilPage() {
  const user = useMockUser();

  const [name, setName] = useState<string>(user?.name || "");
  const [email] = useState<string>("usuario@empresa.com");
  const [jobTitle, setJobTitle] = useState<string>(
    user?.role === "admin" ? "Administrador" : "Membro da equipe",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Mocked update — no backend request.
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Perfil atualizado com sucesso!");
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-6 sm:py-8 px-4">
      <Toaster position="top-right" richColors />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#042C53] sm:text-3xl">
          Meu Perfil
        </h1>
        <p className="mt-1 text-sm text-[#444441]">
          Gerencie suas informações pessoais e segurança.
        </p>
      </header>

      <form onSubmit={onSubmit}>
        {/* Card 1 — Dados Pessoais */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#042C53]">
            Dados Pessoais
          </h2>

          <div className="mt-5 flex items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#185FA5]/10 text-lg font-semibold text-[#185FA5]"
            >
              {initialsOf(name)}
            </div>
            <button
              type="button"
              onClick={() => toast("Foto de perfil (mock)")}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/5"
            >
              Alterar foto
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <Field label="Nome Completo" htmlFor="name">
              <input
                id="name"
                value={name || ""}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
                placeholder="Seu nome"
              />
            </Field>

            <Field label="E-mail Corporativo" htmlFor="email">
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email || ""}
                  disabled
                  readOnly
                  className="h-11 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 pr-10 text-sm text-gray-500"
                />
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                O e-mail corporativo não pode ser alterado aqui.
              </p>
            </Field>

            <Field label="Cargo / Função" htmlFor="jobTitle">
              <input
                id="jobTitle"
                value={jobTitle || ""}
                onChange={(e) => setJobTitle(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
                placeholder="Ex.: Chef de Cozinha"
              />
            </Field>
          </div>
        </section>

        {/* Card 2 — Segurança */}
        <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#042C53]">Segurança</h2>
          <p className="mt-1 text-sm text-[#444441]">
            Atualize sua senha regularmente para manter sua conta segura.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <Field label="Senha Atual" htmlFor="currentPassword">
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword || ""}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
                placeholder="••••••••"
              />
            </Field>

            <Field label="Nova Senha" htmlFor="newPassword">
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword || ""}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
                placeholder="Mínimo 8 caracteres"
              />
            </Field>
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#185FA5] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#042C53] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-2"
          >
            Salvar Alterações
          </button>
        </div>
      </form>
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
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[#042C53]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
