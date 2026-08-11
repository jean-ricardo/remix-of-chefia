import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  UserPlus,
  MoreVertical,
  Shield,
  User as UserIcon,
  Trash2,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers, useRotinaRealtime } from "@/lib/useRotina";
import { deleteUserAccount } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
});

function EquipePage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useTeamMembers();
  useRotinaRealtime();

  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const doDeleteUser = useServerFn(deleteUserAccount);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  async function handleDelete() {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const member = members.find((m) => m.id === deletingId);
      if (!member) throw new Error("Membro não encontrado");

      // Use the server function to delete from auth + database
      if (member.user_id) {
        await doDeleteUser({ data: { targetUserId: member.user_id } });
      } else {
        // Fallback for members without linked auth user
        const { error } = await supabase
          .from("team_members")
          .delete()
          .eq("id", deletingId);
        if (error) throw error;
      }

      toast.success("Membro removido com sucesso");
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (error: any) {
      console.error("Erro ao deletar:", error);
      toast.error(error.message || "Falha ao remover membro");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  async function toggleRole(memberId: string, currentRole: string | null) {
    const newRole = currentRole === "master" ? "membro" : "master";
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Cargo atualizado");
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar cargo");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#042C53]">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os membros e permissões da sua empresa
          </p>
        </div>
        <Button className="bg-[#185FA5] hover:bg-[#042C53]">
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar Membro
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-4">Membro</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    Nenhum membro encontrado.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#185FA5]/10 text-sm font-bold text-[#185FA5]">
                          {member.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#042C53]">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={member.role === "master" ? "default" : "secondary"}>
                        {member.role === "master" ? "Master" : "Membro"}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.cargo_principal}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                        {member.telefone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {member.telefone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentUser?.id !== member.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => toggleRole(member.id, member.role)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Tornar {member.role === "master" ? "Membro" : "Master"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setDeletingId(member.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover da Equipe
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este membro? O acesso dele será revogado
              imediatamente e sua conta será deletada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingId(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
