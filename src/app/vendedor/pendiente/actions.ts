"use server";
import { createAdminClient } from "@/lib/supabase/admin-server";

// Estado del registro del usuario logueado (para el poller de la sala de espera).
// Lee su propio artesano por user_id (RLS "dueño" 0008 lo permite en cualquier status).
export async function estadoRegistro(): Promise<"activo" | "pendiente" | "ninguno"> {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "ninguno";
  const { data: art } = await supabase
    .from("artesanos")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  const status = (art as { status?: string } | null)?.status;
  if (status === "activo") return "activo";
  if (status === "pendiente") return "pendiente";
  return "ninguno";
}
