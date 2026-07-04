"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin-server";
import { clienteIp, estaBloqueado, registrarFallo, limpiarIntentos } from "@/lib/admin/rate-limit";
import type { ActionState } from "@/lib/admin/types";

const credSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  password: z.string().min(1, "Requerido"),
});

// Login del COMPRADOR. Cualquier auth.user puede entrar (sin gate de rol). Rate-limit por IP+email
// (prefijo buyer:). La barrera real es GoTrue + WAF.
export async function iniciarSesionComprador(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clienteIp();
  const emailKey = "buyer:" + String(formData.get("email") ?? "").trim().toLowerCase();
  if (estaBloqueado(ip) || estaBloqueado(emailKey)) {
    return { message: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo." };
  }

  const parsed = credSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const supabase = await createAdminClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    registrarFallo(ip);
    registrarFallo(emailKey);
    return { message: "Correo o contraseña incorrectos." };
  }

  limpiarIntentos(ip);
  limpiarIntentos(emailKey);
  revalidatePath("/cuenta", "layout");
  redirect("/cuenta");
}

export async function cerrarSesionComprador(): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
