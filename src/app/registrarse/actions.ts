"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin-server";
import { clienteIp, estaBloqueado, registrarFallo, limpiarIntentos } from "@/lib/admin/rate-limit";
import { passwordFuerteSchema } from "@/lib/password-strength";
import type { ActionState } from "@/lib/admin/types";

const schema = z.object({
  // Registro MÍNIMO: solo correo + contraseña. Nombre opcional (perfilado progresivo);
  // teléfono/dirección se piden hasta el primer checkout.
  nombre: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email("Correo inválido").transform((s) => s.toLowerCase()),
  password: passwordFuerteSchema,
  // Consentimiento REQUERIDO (Aviso de Privacidad + Términos). Checkbox no premarcado → "on".
  acepto: z.literal("on", { errorMap: () => ({ message: "Debes aceptar el Aviso y los Términos." }) }),
  // Consentimiento de marketing: SEPARADO y opcional. Checkbox → "on" cuando se marca.
  marketing: z.string().optional(),
});

function apiBase(): string | null {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "") ??
    null
  );
}

/**
 * Alta de COMPRADOR. La cuenta la crea apps/api con service_role (/buyers/register) porque el
 * signup público de GoTrue puede estar cerrado; luego se hace login para setear las cookies.
 * Rate-limit por IP (prefijo buyer-signup:). Sin tarjeta (eso va en el pago).
 */
export async function registrarComprador(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clienteIp();
  if (estaBloqueado("buyer-signup:" + ip)) {
    return { message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return { message: "El registro no está disponible en este entorno." };

  let res: Response;
  try {
    res = await fetch(`${base}/buyers/register`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: d.email,
        password: d.password,
        nombre: d.nombre || undefined,
        marketing_consent: d.marketing === "on",
      }),
      cache: "no-store",
    });
  } catch {
    registrarFallo("buyer-signup:" + ip);
    return { message: "No se pudo crear la cuenta. Intenta de nuevo." };
  }
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string; code?: string }
    | null;
  if (!res.ok || !data?.ok) {
    registrarFallo("buyer-signup:" + ip);
    if (data?.code === "email_en_uso") {
      return { errors: { email: ["Ese correo ya tiene una cuenta. Inicia sesión."] } };
    }
    return { message: data?.error ?? "No se pudo crear la cuenta." };
  }

  // Login inmediato → cookies de sesión.
  const supabase = await createAdminClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: d.email,
    password: d.password,
  });
  limpiarIntentos("buyer-signup:" + ip);
  if (error) redirect("/entrar?nueva=1"); // cuenta creada; que entre manual
  redirect("/registrarse/onboarding"); // pequeño onboarding progresivo (saltable)
}
