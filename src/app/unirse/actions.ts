"use server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-server";
import { crearCuentaVendedor } from "@/lib/vendedor/claim-service";
import { claimSchema } from "@/lib/vendedor/schemas";
import { registroSchema, type RegistroInput } from "@/lib/registro/schema";
import {
  clienteIp,
  estaBloqueado,
  registrarFallo,
  limpiarIntentos,
} from "@/lib/admin/rate-limit";
import { procesarImagen } from "@/lib/imagenes/pipeline";
import type { ActionState } from "@/lib/admin/types";

// Procesa una foto (File) con el pipeline (magic bytes + strip EXIF/GPS + WebP) y la
// devuelve en base64, o undefined si es inválida/ausente. Se sube en /register DESPUÉS de
// crear el artesano (orphan-safe): nada toca Storage antes de que exista el artesano.
async function procesarFotoB64(file?: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  try {
    const { buffer } = await procesarImagen(await file.arrayBuffer());
    return buffer.toString("base64");
  } catch {
    return undefined;
  }
}

/**
 * CLAIM público: el artesano abre `/unirse?t=...`, elige contraseña y crea su
 * cuenta. Flujo (ver docs/INVITACION_ACCESO.md):
 *   1) Validar entrada (zod) + rate limit (anti fuerza bruta de tokens).
 *   2) Crear la cuenta + ligar user_id↔artesano vía el servicio con service_role
 *      (crear-vendedor). Ese servicio es la AUTORIDAD: revalida el hash (contra
 *      invitacion_valida de 0008, service_role-only para no exponer un oráculo a
 *      anon), crea el usuario y marca la invitación usada en una transacción
 *      idempotente, y devuelve un código de error amable si falla.
 *   3) Iniciar sesión con el cliente cookie-bound → cae en su panel de vendedor.
 *
 * `createAdminClient()` aquí NO implica admin: es el cliente Supabase ligado a
 * cookies (anon key + sesión). Lo reusamos por el manejo endurecido de cookies.
 */
export async function reclamarInvitacion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clienteIp();
  if (estaBloqueado(ip)) {
    return {
      message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  const parsed = claimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { token, email, password } = parsed.data;

  const supabase = await createAdminClient();

  // (2) Crear la cuenta vía el punto de integración service_role, que es la
  // AUTORIDAD del claim: revalida el token contra invitacion_valida (0008), crea
  // el usuario y sella la invitación en una transacción idempotente. No hacemos
  // pre-chequeo aquí: invitacion_valida es service_role-only (no la puede llamar
  // este cliente anon), y el servicio ya devuelve un código de error amable.
  const resultado = await crearCuentaVendedor({ token, email, password });
  if (!resultado.ok) {
    registrarFallo(ip);
    const message =
      resultado.code === "email_en_uso"
        ? "Ese correo ya tiene una cuenta. Inicia sesión en su lugar."
        : resultado.code === "expirada"
          ? "Esta invitación caducó. Pídele al equipo de Tlachiwalis un enlace nuevo."
          : resultado.code === "usada"
            ? "Esta invitación ya se usó. Si ya tienes cuenta, inicia sesión."
            : resultado.code === "invalida"
              ? "Este enlace de invitación no es válido."
              : resultado.error;
    return { message };
  }

  // (3) Iniciar sesión (setea cookies de sesión vía el cliente cookie-bound).
  const { error: eLogin } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (eLogin) {
    // La cuenta SÍ se creó; solo falló el auto-login. Mándalo a iniciar sesión.
    limpiarIntentos(ip);
    return {
      ok: true,
      message:
        "Tu cuenta quedó lista. Inicia sesión con tu correo y contraseña para entrar a tu panel.",
    };
  }

  limpiarIntentos(ip);
  return {
    ok: true,
    message: "¡Listo! Tu cuenta está creada. Entrando a tu panel…",
  };
}

/**
 * ENVÍO REAL del registro autoguiado (wizard). Valida server-side, llama al servicio con
 * service_role (apps/api /sellers/register) que crea la cuenta + el artesano en 'pendiente'
 * y consume el link; luego inicia sesión (queda logueado como pendiente) y manda a la sala
 * de espera. El artesano NO entra al panel hasta que el admin apruebe.
 */
export async function enviarRegistro(
  datos: RegistroInput,
  fotoPerfil?: File | null,
  fotoPortada?: File | null,
): Promise<{ error?: string }> {
  const ip = await clienteIp();
  if (estaBloqueado(ip)) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const parsed = registroSchema.safeParse(datos);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa tus datos e intenta de nuevo." };
  }
  const d = parsed.data;

  // Fotos → WebP base64 (se suben en /register tras crear el artesano; orphan-safe).
  const [fotoPerfilB64, fotoPortadaB64] = await Promise.all([
    procesarFotoB64(fotoPerfil),
    procesarFotoB64(fotoPortada),
  ]);

  const base =
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "");
  const svcToken = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !svcToken) {
    return {
      error: "El registro aún no está disponible en este entorno. Avísale al equipo de Tlachiwalis.",
    };
  }

  let resultado: { ok?: boolean; error?: string; code?: string } = {};
  try {
    const res = await fetch(`${base}/sellers/register`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${svcToken}` },
      body: JSON.stringify({ ...d, fotoPerfilB64, fotoPortadaB64 }),
      cache: "no-store",
    });
    resultado = ((await res.json().catch(() => null)) as typeof resultado) ?? {};
  } catch {
    return { error: "No se pudo enviar tu solicitud. Intenta de nuevo en un momento." };
  }

  if (!resultado.ok) {
    registrarFallo(ip);
    const msg =
      resultado.code === "email_en_uso"
        ? "Ese correo ya tiene una cuenta. Inicia sesión en su lugar."
        : resultado.code === "usada"
          ? "Este enlace de invitación ya se usó."
          : resultado.code === "expirada"
            ? "Este enlace de invitación caducó."
            : resultado.code === "invalida"
              ? "Este enlace de invitación no es válido."
              : resultado.error ?? "No se pudo enviar tu solicitud.";
    return { error: msg };
  }

  // Cuenta creada (artesano 'pendiente') → iniciar sesión y mandar a la sala de espera.
  limpiarIntentos(ip);
  const supabase = await createAdminClient();
  await supabase.auth.signInWithPassword({ email: d.email, password: d.password });
  redirect("/vendedor/pendiente"); // NEXT_REDIRECT — fuera de try/catch
}
