import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Pencil, Upload, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompanyIdentity() {
  const currentUser = useCurrentUser();
  const [team, setTeam] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = currentUser.role === "admin" || currentUser.role === "gestor";

  useEffect(() => {
    if (currentUser.team_id) {
      fetchTeam();
    }
  }, [currentUser.team_id]);

  async function fetchTeam() {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("id", currentUser.team_id!)
      .single();

    if (!error && data) {
      setTeam(data);
      setNewName(data.name);
    }
  }

  async function handleUpdateName() {
    if (!newName.trim() || !team) return;
    
    const { error } = await supabase
      .from("teams")
      .update({ name: newName.trim() })
      .eq("id", team.id);

    if (error) {
      toast.error("Erro ao atualizar nome da empresa.");
    } else {
      toast.success("Nome da empresa atualizado!");
      setTeam({ ...team, name: newName.trim() });
      setIsEditing(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !team) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${team.id}/${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Use 'activities' as a fallback if the bucket list is unknown, 
      // but typically there's a 'logos' or 'public' bucket.
      const bucket = "activities";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("teams")
        .update({ logo_url: publicUrl })
        .eq("id", team.id);

      if (updateError) throw updateError;

      setTeam({ ...team, logo_url: publicUrl });
      toast.success("Logo atualizada com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao subir imagem.");
    } finally {
      setIsUploading(false);
    }
  }

  if (!team) return null;

  return (
    <div className="flex items-center gap-4 py-2 px-1">
      <div className="relative group">
        <div className={cn(
          "h-14 w-14 overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm flex items-center justify-center transition-all duration-300 group-hover:shadow-md group-hover:border-navy/20",
          isUploading && "opacity-50"
        )}>
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="h-full w-full object-contain p-1" />
          ) : (
            <Building2 className="h-7 w-7 text-muted-foreground/30" />
          )}
        </div>
        
        {isAdmin && !isUploading && (
          <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-navy text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95">
            <Upload className="h-3.5 w-3.5" />
            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
          </label>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              className="h-9 py-0 px-2 text-xl font-bold w-48 bg-white border-navy/20 focus-visible:ring-navy"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateName();
                if (e.key === 'Escape') { setIsEditing(false); setNewName(team.name); }
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={handleUpdateName}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => { setIsEditing(false); setNewName(team.name); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group/title">
            <h2 className="truncate font-display text-2xl font-bold tracking-tight text-navy">
              {team.name}
            </h2>
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover/title:opacity-100 transition-opacity hover:bg-navy/5" 
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 text-navy/40" />
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-[#185FA5]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#185FA5]/70">
            Painel Corporativo
          </span>
        </div>
      </div>
    </div>
  );
}
