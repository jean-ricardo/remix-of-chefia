import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useCurrentUser } from "@/lib/auth";
import { formatWhatsApp, isValidWhatsApp } from "@/lib/whatsapp";


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

const JOB_OPTIONS = [
  "Administrador",
  "Diretor",
  "Gerente",
  "Coordenador",
  "Analista",
  "Operações",
  "Marketing",
  "Vendas",
  "TI",
  "Outro",
] as const;

function initialsOf(name: string | undefined) {
  const n = (name || "Usuário").trim();
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

function PerfilPage() {
  const user = useCurrentUser();

  const [name, setName] = useState<string>(user?.name || "");
  const [email] = useState<string>(user?.email || "");
  const [jobTitle, setJobTitle] = useState<string>(
    user?.role === "admin" ? "Diretor" : user?.role === "gestor" ? "Adm" : "Membro",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // WhatsApp: mocked only — NOT sent to backend (schema pending).
  const [whatsapp, setWhatsapp] = useState<string>("");
  const hasSavedWhatsapp = whatsapp.trim().length > 0;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUrlRef = useRef<string | null>(null);

  // Keep ref in sync so unmount cleanup can revoke the latest URL.
  useEffect(() => {
    avatarUrlRef.current = avatarUrl;
  }, [avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarUrlRef.current) {
        URL.revokeObjectURL(avatarUrlRef.current);
        avatarUrlRef.current = null;
      }
    };
  }, []);

  function handlePickPhoto() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file still fires change.
    e.target.value = "";
    if (!file) return;

    // Revoke previous URL to prevent memory leaks.
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    // Conditional password validation: only when user typed a new password.
    if (newPassword.length > 0) {
      if (newPassword.length < 8) {
        toast.warning("A nova senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.warning("As senhas não coincidem. Verifique e tente novamente.");
        return;
      }
    }

    if (whatsapp.trim().length > 0 && !isValidWhatsApp(whatsapp)) {
      toast.warning("Informe um WhatsApp válido para receber notificações.");
      return;
    }

    // NOTE: `whatsapp` is intentionally excluded from any backend payload —
    // the profile table does not yet have this column. Mock-only for now.
    // eslint-disable-next-line no-console
    console.info("[mock] WhatsApp salvo no perfil:", whatsapp);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Foto e dados atualizados com sucesso (Mock)!");
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-6 sm:py-8 px-4">
      <Toaster richColors />

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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[#185FA5]/20"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#185FA5]/10 text-lg font-semibold text-[#185FA5]"
              >
                {initialsOf(name)}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handlePickPhoto}
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
              <select
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
              >
                {JOB_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="WhatsApp (Celular)" htmlFor="whatsapp">
              <input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                pattern="[0-9\-\+\s\(\)]*"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                placeholder="+55 (11) 91234-5678"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
              />
              {hasSavedWhatsapp ? (
                <p className="mt-1 text-xs text-gray-500">
                  Usado exclusivamente para receber notificações da plataforma.
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1 text-xs text-[#D85A30]">
                  <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
                  Complete seu cadastro para receber avisos.
                </p>
              )}
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

            <Field label="Confirmar Nova Senha" htmlFor="confirmPassword">
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword || ""}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#042C53] focus:border-[#185FA5] focus:outline-none focus:ring-2 focus:ring-[#185FA5]/30"
                placeholder="Repita a nova senha"
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
