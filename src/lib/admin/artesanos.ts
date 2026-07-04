import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import type { ArtesanoAdmin, ArtesanoOpcion } from "@/lib/admin/types";

const COLS =
  "id,slug,nombre,semblanza,region,oficio,foto_url,rfc,regimen_fiscal,clabe,status,user_id,created_at,updated_at,stripe_account_id,cobros_habilitados,cobros_detalles_enviados,es_demo,nombres,apellido_paterno,apellido_materno,fecha_nacimiento,telefono,tipo_vendedor,nombre_negocio,num_personas,direccion,redes,envia_nacional,anios_experiencia";

// A diferencia de lib/catalog.ts (público, degrada a estático), las lecturas
// admin PROPAGAN errores: un fallo no debe enmascararse con datos demo.
export async function listarArtesanos(): Promise<ArtesanoAdmin[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("artesanos")
    .select(COLS)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron leer artesanos: ${error.message}`);
  return (data ?? []) as ArtesanoAdmin[];
}

export async function getArtesano(id: string): Promise<ArtesanoAdmin | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("artesanos")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ArtesanoAdmin) ?? null;
}

export async function listarArtesanosOpciones(): Promise<ArtesanoOpcion[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("artesanos")
    .select("id,nombre")
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ArtesanoOpcion[];
}
