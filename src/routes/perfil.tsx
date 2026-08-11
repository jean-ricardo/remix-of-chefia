import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { User, Mail, Phone, Shield, Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTelefone(user.telefone || "");
    }
  }, [user]);

  async function handleUpdateProfile() {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("team_members")
        .update({
          name,
          telefone,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshUser();
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(error.message || "Falha ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#042C53]">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações pessoais e cargo
          </p>
        </div>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>
            Esses dados são visíveis para outros membros da equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email}
                  disabled
                  className="bg-gray-50 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefone">WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="pl-10"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cargo / Role</Label>
              <div className="flex items-center gap-2">
                <Badge variant={user?.role === "master" ? "default" : "secondary"}>
                  {user?.role === "master" ? "Master" : "Membro"}
                </Badge>
                {user?.role === "master" && (
                  <Shield className="h-4 w-4 text-[#185FA5]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.cargo || "Nenhum cargo definido"}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="bg-[#185FA5] hover:bg-[#042C53]"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
