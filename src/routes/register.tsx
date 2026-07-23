import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { setMockRole } from "@/lib/mockUser";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { formatWhatsApp, isValidWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar Conta Corporativa — Chef.IA" },
      { name: "description", content: "Crie sua conta corporativa Chef.IA e organize a rotina da sua equipe em minutos." },
      { property: "og:title", content: "Criar Conta Corporativa — Chef.IA" },
      { property: "og:description", content: "Crie sua conta corporativa Chef.IA e organize a rotina da sua equipe em minutos." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
  });
  const [whatsapp, setWhatsapp] = useState("");

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidWhatsApp(whatsapp)) {
      toast.warning("Informe um WhatsApp válido para receber notificações.");
      return;
    }
    // NOTE: WhatsApp is intentionally NOT sent to the auth API yet — backend
    // schema does not have this column. Mock its submission on the frontend.
    // eslint-disable-next-line no-console
    console.info("[mock] WhatsApp capturado no cadastro:", whatsapp);
    toast.success("Conta criada! WhatsApp registrado para notificações (mock).");
    setMockRole("admin");
    navigate({ to: "/" });
  }

  return (
    <AuthLayout
      title="Criar Conta Corporativa"
      subtitle="Comece a organizar a rotina da sua equipe hoje mesmo."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome Completo" htmlFor="name">
          <input
            id="name"
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Seu nome"
            className="auth-input"
          />
        </Field>

        <Field label="E-mail corporativo" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="voce@empresa.com"
            className="auth-input"
          />
        </Field>

        <Field label="Nome da Empresa" htmlFor="company">
          <input
            id="company"
            required
            autoComplete="organization"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Ex.: Chef Cozinhas Ltda."
            className="auth-input"
          />
        </Field>

        <Field label="Crie uma Senha" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="auth-input"
          />
        </Field>

        <Field label="WhatsApp (Celular)" htmlFor="whatsapp">
          <input
            id="whatsapp"
            type="tel"
            inputMode="numeric"
            pattern="[0-9\-\+\s\(\)]*"
            required
            autoComplete="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
            placeholder="+55 (11) 91234-5678"
            className="auth-input focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
          />
          <p className="mt-1 text-xs text-gray-500">
            Usado exclusivamente para receber notificações da plataforma.
          </p>
        </Field>


        <button
          type="submit"
          className="min-h-[48px] w-full rounded-xl bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#993C1D] focus:outline-none focus:ring-2 focus:ring-[#D85A30] focus:ring-offset-2"
        >
          Criar Conta Corporativa
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#444441]">
        Já tem uma conta?{" "}
        <Link to="/login" className="font-semibold text-[#185FA5] hover:underline">
          Entrar
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
