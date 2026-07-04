import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-server";

/**
 * Autoridad de autorización del panel de VENDEDOR (Data Access Layer). Espejo de
 * `requireAdmin` (lib/admin/auth.ts): memoizada por request con React `cache()`
 * para no repetir las llamadas de red. La llaman CADA page de vendedor y CADA
 * Server Action mutante del vendedor — defensa en profundidad SOBRE la RLS
 * "dueño" de Postgres (0008); una Server Action es un endpoint POST público.
 *
 * Reusa createAdminClient() (mal nombrado por historia: es el cliente Supabase
 * ligado a las cookies de sesión, NO service_role). Porta el JWT del usuario, así
 * que es_vendedor()/mi_artesano_id() se evalúan bajo su identidad.
 *
 * Usa getUser() (valida el token por red), NO getSession() (no valida firma).
 * redirect() lanza NEXT_REDIRECT, por eso va sin try/catch alrededor.
 *
 * Devuelve `artesanoId`: el vendedor SIEMPRE opera sobre su propio artesano; el
 * caller nunca lo recibe del cliente (anti-IDOR). Es la autoridad de propiedad.
 */
export const requireVendedor = cache(async () => {
  const supabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/vendedor/login");

  // Lee su artesano por user_id. La RLS "dueño" (0008 artesanos_vendedor_select) permite
  // leer la PROPIA fila sin importar el status, así que también funciona en 'pendiente'.
  const { data: art } = await supabase
    .from("artesanos")
    .select("id,status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!art) redirect("/vendedor/login");
  const a = art as { id: string; status: string };
  // 'pendiente' = registrado, en revisión → sala de espera (no al panel).
  if (a.status === "pendiente") redirect("/vendedor/pendiente");
  // 'pausado'/otro = sin acceso.
  if (a.status !== "activo") redirect("/vendedor/login");

  return { user, supabase, artesanoId: a.id };
});
