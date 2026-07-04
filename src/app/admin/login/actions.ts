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

export async function iniciarSesion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clienteIp();
  // Defensa en profundidad. La IP viene de X-Forwarded-For (falsificable sin un
  // proxy de confianza), por eso limitamos TAMBIÉN por email objetivo: eso frena
  // el brute-force contra una cuenta aunque el atacante rote la IP. La barrera
  // real de fuerza bruta es GoTrue (GOTRUE_RATE_LIMIT_*) + un WAF/proxy delante.
  const emailKey =
    "email:" + String(formData.get("email") ?? "").trim().toLowerCase();
  if (estaBloqueado(ip) || estaBloqueado(emailKey)) {
    return {
      message: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  const parsed = credSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    registrarFallo(ip);
    registrarFallo(emailKey);
    return { message: "Correo o contraseña incorrectos." };
  }

  // Solo entran administradores. Un usuario válido pero sin rol se desautentica.
  const { data: esAdmin } = await supabase.rpc("is_admin");
  if (!esAdmin) {
    await supabase.auth.signOut();
    registrarFallo(ip);
    registrarFallo(emailKey);
    return { message: "Esta cuenta no tiene acceso de administrador." };
  }

  limpiarIntentos(ip);
  limpiarIntentos(emailKey);
  revalidatePath("/admin", "layout");
  redirect("/admin"); // lanza NEXT_REDIRECT — fuera de try/catch
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createAdminClient();
  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}
