import "server-only";
import { requireVendedor } from "@/lib/vendedor/auth";
import type { ArtesanoAdmin } from "@/lib/admin/types";

// Solo las columnas que el vendedor necesita ver de SU propio perfil. Los campos
// fiscales SENSIBLES (rfc/regimen_fiscal/clabe) se piden en el onboarding de
// cobros (fase 6) — aquí NO se leen para no exponerlos en el panel de piezas.
const COLS =
  "id,slug,nombre,taller,region,oficio,semblanza,foto_url,status,cobros_habilitados,cobros_detalles_enviados,stripe_account_id,nombres,apellido_paterno,apellido_materno,fecha_nacimiento,telefono,tipo_vendedor,nombre_negocio,num_personas,direccion,redes,envia_nacional,anios_experiencia";

export type MiArtesano = Pick<
  ArtesanoAdmin,
  | "id"
  | "slug"
  | "nombre"
  | "taller"
  | "region"
  | "oficio"
  | "semblanza"
  | "foto_url"
  | "status"
  | "nombres"
  | "apellido_paterno"
  | "apellido_materno"
  | "fecha_nacimiento"
  | "telefono"
  | "tipo_vendedor"
  | "nombre_negocio"
  | "num_personas"
  | "direccion"
  | "redes"
  | "envia_nacional"
  | "anios_experiencia"
> & {
  // Estado de cobros (Stripe Connect). Los llena el webhook account.updated / la
  // sincronización on-demand. NO son datos fiscales sensibles (rfc/clabe viven en Stripe).
  cobros_habilitados: boolean;
  cobros_detalles_enviados: boolean;
  stripe_account_id: string | null;
};

/**
 * Lee el perfil del artesano dueño de la sesión. La RLS "dueño" (0008) ya acota
 * a `user_id = auth.uid()`, y filtramos también por el `artesanoId` de la DAL.
 * Se usa para autollenar defaults del formulario (maker/región) y el saludo del
 * dashboard.
 */
export async function getMiArtesano(): Promise<MiArtesano> {
  const { supabase, artesanoId } = await requireVendedor();
  const { data, error } = await supabase
    .from("artesanos")
    .select(COLS)
    .eq("id", artesanoId)
    .single();
  if (error) throw new Error(`No se pudo leer tu perfil: ${error.message}`);
  return data as MiArtesano;
}
