import "server-only";
import { requireAdmin } from "@/lib/admin/auth";

// Invitaciones de REGISTRO pendientes (sin artesano aún, vigentes). El admin las ve para
// saber cuántos cupos de registro tiene abiertos y poder revocarlos. El token NO se puede
// re-mostrar (solo se guarda su hash); "reenviar" = generar uno nuevo.
export type InvitacionRegistro = {
  id: string;
  created_at: string;
  expira_en: string;
};

export async function listarInvitacionesRegistro(): Promise<InvitacionRegistro[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("invitaciones")
    .select("id,created_at,expira_en")
    .is("artesano_id", null)
    .is("usado_en", null)
    .is("revocada_en", null)
    .eq("proposito", "registro")
    .gt("expira_en", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron leer las invitaciones: ${error.message}`);
  return (data ?? []) as InvitacionRegistro[];
}
