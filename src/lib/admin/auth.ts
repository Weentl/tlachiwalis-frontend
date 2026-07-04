import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-server";

/**
 * Autoridad de autorización del panel (Data Access Layer). Memoizada por request
 * con React `cache()` para no repetir las llamadas de red. La llaman CADA page
 * admin y CADA Server Action mutante — defensa en profundidad sobre la RLS de
 * Postgres (una Server Action es un endpoint POST público alcanzable directo).
 *
 * Usa getUser() (valida el token por red), NO getSession() (no valida firma).
 * redirect() lanza NEXT_REDIRECT, por eso va sin try/catch alrededor.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: esAdmin, error } = await supabase.rpc("is_admin");
  if (error || !esAdmin) redirect("/admin/login");

  return { user, supabase };
});
