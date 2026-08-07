import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChefiaLogo } from "@/components/brand/ChefiaLogo";
import { PublicOnlyRoute } from "@/components/auth/RouteGuards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cadastrar-empresa")({
  head: () => ({
    meta: [
      { title: "Criar Equipe — Chef.IA" },
      {
        name: "description",
        content: "Crie uma nova equipe para sua empresa no Chef.IA.",
      },
    ],
  }),
  component: CadastrarEmpresaPage,
});

function CadastrarEmpresaPage() {
  return (
    <CadastrarEmpresaContent />
  );
}

function CadastrarEmpresaContent() {
  const navigate = useNavigate();
  const { session, user: authUser } = useAuth();
  const [name, setName] = useState(authUser?.name || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [companyName, setCompanyName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      toast.warning("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setBusy(true);

    try {
      // 1. Check if user already exists
      const { data: { user: existingUser } } = await supabase.auth.getUser();

      if (existingUser) {
        // User is already logged in, but might not have a team. 
        // We update their metadata so the auto-provisioning logic can create the team on next login.
        const { error: updError } = await supabase.auth.updateUser({
          data: {
            is_director: true,
            temp_company_name: companyName.trim(),
            full_name: name.trim(),
            whatsapp: whatsapp.replace(/\D/g, ""),
          }
        });

        if (updError) throw updError;
        
        toast.success("Perfil atualizado! Agora faça login para finalizar a criação da sua empresa.");
      } else {
        // 1. Auth Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              whatsapp: whatsapp.replace(/\D/g, ""),
              is_director: true,
              temp_company_name: companyName.trim(), // Save temporarily to metadata
            },
          },
        });

        if (authError) {
          // If user exists, friendly error
          if (authError.message.includes("User already registered")) {
            toast.info("Você já possui uma conta. Por favor, faça login primeiro.");
            setTimeout(() => navigate({ to: "/login" }), 2000);
            return;
          }
          throw authError;
        }
        
        toast.success("Conta criada com sucesso! Por favor, faça login para configurar sua empresa.");
      }
      
      // Give the user a moment to see the success message
      setTimeout(() => {
        navigate({ to: "/login", replace: true });
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao criar conta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] px-5 py-10 sm:px-8 sm:py-16">
      <Toaster richColors />
      <div className="mx-auto w-full max-w-[440px]">
        <div className="mb-8 flex justify-center">
          <ChefiaLogo className="h-24 w-auto sm:h-28" />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_18px_40px_-28px_rgba(4,44,83,0.45)] ring-1 ring-black/[0.04] sm:p-8">
          <div className="mb-6">
            <button
              onClick={() => navigate({ to: "/login" })}
              className="flex items-center gap-2 text-sm text-[#185FA5] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </button>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-[#042C53] sm:text-2xl">
            Crie sua equipe no Chef.IA
          </h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-[#6f6f6a]">
            Comece a gerenciar a rotina da sua empresa hoje mesmo.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <Field
              id="name"
              label="Nome completo"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />

            <Field
              id="email"
              label="E-mail corporativo"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />

            <Field
              id="company"
              label="Nome da Empresa"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
            />

            <Field
              id="whatsapp"
              label="WhatsApp"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
            />

            <div className="relative">
              <Field
                id="password"
                label="Senha"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute bottom-1 right-0 grid h-10 w-10 place-items-center text-[#8b8b86]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#D85A30] text-[15px] font-semibold text-white transition-all hover:bg-[#c14e28] disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando equipe...
                </>
              ) : (
                "Criar Equipe e Acessar"
              )}
            </button>
          </form>
        </div>
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
        className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b8b86] group-focus-within:text-[#185FA5]"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={cn(
          "peer h-12 w-full border-0 border-b border-[#E0DFDA] bg-transparent px-0 text-[15px] text-[#1c1c1a]",
          "placeholder:text-[#b9b8b2] focus:outline-none focus:ring-0 transition-colors",
          props.className
        )}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-[#185FA5] transition-transform duration-200 peer-focus:scale-x-100" />
    </div>
  );
}
