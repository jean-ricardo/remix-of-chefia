import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChefiaLogo } from "@/components/brand/ChefiaLogo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cadastrar")({
  head: () => ({
    meta: [
      { title: "Criar acesso — Chef.IA" },
      {
        name: "description",
        content:
          "Cadastre-se como membro da equipe no Chef.IA e acompanhe suas atividades em tempo real.",
      },
      { property: "og:title", content: "Criar acesso — Chef.IA" },
      {
        property: "og:description",
        content:
          "Cadastre-se como membro da equipe no Chef.IA e acompanhe suas atividades em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CadastrarPage,
});

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já possui conta. Faça login para continuar.";
  if (m.includes("password"))
    return "Senha muito curta para as regras de segurança. Escolha uma senha maior.";
  if (m.includes("invalid") && m.includes("email")) return "E-mail inválido.";
  return "Não foi possível concluir o cadastro. Tente novamente.";
}

function CadastrarPage() {
  const navigate = useNavigate();
  const { loading, session, signOut } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("1234");
  const [teamCode, setTeamCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) {
      toast.warning("Informe seu nome completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.warning("Informe um e-mail válido.");
      return;
    }

    const cleanCode = teamCode.trim();
    if (!cleanCode) {
      toast.warning("Informe o Código da Equipe fornecido pelo administrador.");
      return;
    }

    setBusy(true);

    // O código NÃO é validado contra o banco (RLS bloqueia anônimos).
    // Ele é aceito às cegas e guardado no metadata + no perfil pendente.
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: cleanName,
          team_code_pending: cleanCode,
          status: "pendente",
        },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(friendlyError(error.message));
      return;
    }

    // Perfil aguardando aprovação. `role` guarda apenas texto livre
    // (equipe:<código>), nunca uma coluna relacional.
    try {
      const { data: existing } = await supabase
        .from("team_members")
        .select("id,cargo_principal")
        .ilike("email", cleanEmail)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        // Membros já aprovados nunca voltam para pendente (retrocompatibilidade).
        if (String(existing.cargo_principal ?? "").toLowerCase() === "pendente") {
          await supabase
            .from("team_members")
            .update({ name: cleanName, role: `equipe:${cleanCode}` })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("team_members")
            .update({ name: cleanName })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("team_members").insert({
          name: cleanName,
          email: cleanEmail,
          cargo_principal: "pendente",
          role: `equipe:${cleanCode}`,
        });
      }
    } catch (err) {
      console.error("[cadastrar] falha ao gravar perfil na equipe", err);
    }


    if (!data.session) {
      // E-mail com confirmação obrigatória: tenta login imediato.
      await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    }

    const { data: after } = await supabase.auth.getSession();
    setBusy(false);

    if (after.session) {
      toast.success(
        "Cadastro realizado! Aguarde a aprovação do administrador da equipe.",
      );
      navigate({ to: "/", replace: true });
      return;
    }

    toast.success(
      "Cadastro criado! Confirme o e-mail que enviamos para liberar seu acesso.",
    );
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] px-5 py-10 sm:px-8 sm:py-16">
      <Toaster richColors />
      <div className="mx-auto w-full max-w-[440px]">
        <div className="mb-8 flex justify-center">
          <ChefiaLogo className="h-24 w-auto sm:h-28" />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_18px_40px_-28px_rgba(4,44,83,0.45)] ring-1 ring-black/[0.04] sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-[#042C53] sm:text-2xl">
            Criar meu acesso
          </h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-[#6f6f6a]">
            Você foi convidado para a equipe. Preencha os dados abaixo — seu acesso
            será liberado após a aprovação do administrador.
          </p>

          {!loading && session ? (
            <div className="mt-5 rounded-xl border border-[#185FA5]/20 bg-[#185FA5]/[0.06] p-4 text-[0.85rem] leading-relaxed text-[#185FA5]">
              Você já está logado. Para cadastrar um novo membro, abra este link em
              uma janela anônima ou faça logout.
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#185FA5]/30 px-3 text-[0.8rem] font-medium text-[#185FA5] transition-colors hover:bg-[#185FA5]/10"
              >
                <LogOut className="h-4 w-4" />
                Sair desta conta
              </button>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <Field
              id="cd-name"
              label="Nome completo"
              required
              autoComplete="name"
              disabled={busy}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />

            <Field
              id="cd-email"
              label="E-mail"
              type="email"
              required
              autoComplete="email"
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />

            <Field
              id="cd-team"
              label="Código da Equipe"
              required
              disabled={busy}
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              placeholder="Cole aqui o código enviado pelo administrador"
            />

            <div className="relative">
              <Field
                id="cd-password"
                label="Senha"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute bottom-1 right-0 grid h-10 w-10 place-items-center rounded-lg text-[#8b8b86] transition-colors hover:text-[#185FA5]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="-mt-2 text-[11px] text-[#9a9a95]">
              Você pode alterar a senha sugerida antes de continuar.
            </p>

            <button
              type="submit"
              disabled={busy}
              className={cn(
                "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-4",
                "bg-[#D85A30] text-[15px] font-semibold text-white transition-all",
                "hover:bg-[#c14e28] active:translate-y-px",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D85A30]/40 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando acesso...
                </>
              ) : (
                "Criar meu acesso"
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[11px] text-[#9a9a95]">
          © {new Date().getFullYear()} Chef.IA
        </p>
      </div>
    </div>
  );
}

function Field({
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
