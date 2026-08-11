import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PublicOnlyRoute } from "@/components/auth/RouteGuards";

const signupSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  telefone: z.string().optional(),
});

type SignupValues = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/cadastrar")({
  component: SignupPage,
});

function SignupPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      telefone: "",
    },
  });

  async function onSubmit(values: SignupValues) {
    setLoading(true);
    try {
      // 1. Create user in auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
            whatsapp: values.telefone,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Erro ao criar conta");

      // 2. Refresh user state (auto-provisioning happens in resolveCurrentUser)
      await refreshUser();

      toast.success("Conta criada com sucesso! Verifique seu e-mail.");
      navigate({ to: "/" });
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      toast.error(error.message || "Ocorreu um erro ao criar sua conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicOnlyRoute>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
        <div className="mx-auto w-full max-w-[400px] space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Criar uma conta</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os dados abaixo para começar
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </div>

          <div className="flex justify-center">
            <Link
              to="/"
              className="flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    </PublicOnlyRoute>
  );
}
