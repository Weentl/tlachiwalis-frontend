import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-server";

/**
 * Autoridad de sesión del COMPRADOR. A diferencia de requireVendedor, NO exige rol/estado:
 * cualquier auth.user puede comprar (un artesano también es comprador). Memoizada por request.
 * getUser() valida el JWT por red (no getSession). redirect() lanza NEXT_REDIRECT (sin try/catch).
 */
export const requireComprador = cache(async () => {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { user, supabase };
});

// Usuario actual SIN redirigir (para slots opcionales, p.ej. el header). null si anon.
export const getUsuarioActual = cache(async () => {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
