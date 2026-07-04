"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin-server";
import {
  clienteIp,
  estaBloqueado,
  registrarFallo,
  limpiarIntentos,
} from "@/lib/admin/rate-limit";
import type { ActionState } from "@/lib/admin/types";

const credSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(1, "Requerido"),
});

/**
 * Login del VENDEDOR. Reusa el mismo rate-limit por IP + email que el admin
 * (defensa en profundidad; la barrera real es GoTrue + WAF). Solo entra quien es
 * vendedor (artesanos.user_id = auth.uid(), vía es_vendedor()); un usuario válido
 * sin ese rol se desautentica. El registro público está deshabilitado
 * (GOTRUE_DISABLE_SIGNUP=true): las cuentas nacen del claim de invitación.
 */
export async function iniciarSesionVendedor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clienteIp();
  const emailKey =
    "vend:" + String(formData.get("email") ?? "").trim().toLowerCase();
  if (estaBloqueado(ip) || estaBloqueado(emailKey)) {
    return {
      message: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  const parsed = credSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const supabase = await createAdminClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    registrarFallo(ip);
    registrarFallo(emailKey);
    return { message: "Correo o contraseña incorrectos." };
  }

  // Ruteo por estado del artesano: activo→panel, pendiente→sala de espera, otro→sin acceso.
  const { data: art } = await supabase
    .from("artesanos")
    .select("status")
    .eq("user_id", signIn.user?.id ?? "")
    .maybeSingle();
  const status = (art as { status?: string } | null)?.status;
  if (!status) {
    await supabase.auth.signOut();
    registrarFallo(ip);
    registrarFallo(emailKey);
    return {
      message:
        "Esta cuenta no tiene un taller ligado. Si te invitaron, abre tu enlace de invitación.",
    };
  }
  if (status === "pausado") {
    await supabase.auth.signOut();
    return { message: "Tu cuenta está suspendida. Escríbele al equipo de Tlachiwalis." };
  }

  limpiarIntentos(ip);
  limpiarIntentos(emailKey);
  revalidatePath("/vendedor", "layout");
  // pendiente → sala de espera; activo → panel. (No cerramos sesión: sigue logueado.)
  redirect(status === "pendiente" ? "/vendedor/pendiente" : "/vendedor");
}

export async function cerrarSesionVendedor(): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.auth.signOut();
  revalidatePath("/vendedor", "layout");
  redirect("/vendedor/login");
}
