import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Núcleo de la INVITACIÓN de artesanos (marketplace curado: el admin invita,
 * nadie se registra solo). Diseño en docs/INVITACION_ACCESO.md.
 *
 * Modelo de seguridad del token (obligatorio):
 *  - Aleatorio ≥32 bytes (aquí 32) → imposible de adivinar.
 *  - Se GUARDA HASHEADO (SHA-256) en `public.invitaciones.token_hash`; el token
 *    en claro solo existe en el link que el admin comparte. Si se filtra la BD,
 *    no hay tokens usables.
 *  - Un solo uso (`usado_en`) + revocable (`revocada_en`) y TTL (7 días, `expira_en`).
 *  - Ligado a UN artesano (`artesano_id`).
 *
 * Esquema real (lo crea la migración 0008 — NO se aplica aquí). El estado NO es una
 * columna `status`: se deriva de los timestamps. "pendiente" = usado_en IS NULL AND
 * revocada_en IS NULL AND expira_en > now() (ver public.invitacion_valida).
 *   public.invitaciones(
 *     id uuid pk default gen_random_uuid(),
 *     artesano_id uuid not null references public.artesanos(id) on delete cascade,
 *     token_hash text not null,                 -- sha256 hex del token en claro
 *     email text,                               -- opcional (solo referencia)
 *     expira_en timestamptz not null,           -- TTL
 *     usado_en timestamptz,                      -- se sella en el claim → un solo uso
 *     revocada_en timestamptz,                   -- el admin la invalida antes de usarse
 *     creada_por uuid references auth.users(id),
 *     created_at timestamptz not null default now(),
 *     unique (token_hash)                       -- respaldo real de un-solo-uso
 *   )
 */

/** Bytes del token en claro. 32 bytes → 43 chars base64url (>256 bits). */
const TOKEN_BYTES = 32;

/** Vida útil de la invitación. */
export const TTL_DIAS = 7;

/** Token opaco url-safe (base64url, sin `=`/`+`/`/`). Va SOLO en el link. */
export function generarToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** Hash determinístico que se guarda en BD (nunca el token en claro). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Compara el hash de un token candidato contra el guardado, en tiempo constante
 * (evita distinguir por latencia). Ambos son hex de 64 chars (misma longitud).
 */
export function tokenCoincide(tokenPlano: string, hashGuardado: string): boolean {
  const a = Buffer.from(hashToken(tokenPlano), "hex");
  const b = Buffer.from(hashGuardado ?? "", "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Instante de expiración (ahora + TTL). */
export function expiraEn(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + TTL_DIAS * 24 * 60 * 60 * 1000);
}

/**
 * Base URL pública del sitio para armar el link `/unirse?t=...`.
 * Preferimos una env explícita (producción). En dev cae al localhost del `Host`
 * si se pasa; nunca confiar en `Host` para nada de seguridad, solo para armar un
 * link cómodo de copiar en desarrollo.
 */
export function siteUrl(hostHeader?: string | null): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (env) return env.replace(/\/+$/, "");
  if (hostHeader) {
    const proto = hostHeader.startsWith("localhost") || hostHeader.startsWith("127.")
      ? "http"
      : "https";
    return `${proto}://${hostHeader}`;
  }
  return "https://tlachiwalis.com";
}

/** Arma el link de invitación que el admin comparte por WhatsApp. */
export function linkDeInvitacion(token: string, hostHeader?: string | null): string {
  return `${siteUrl(hostHeader)}/unirse?t=${encodeURIComponent(token)}`;
}

/**
 * Genera una invitación para un artesano y devuelve el link en claro UNA sola vez.
 * Lo comparten crearArtesano (alta) e invitarArtesano (reenvío). El caller YA validó
 * authz (requireAdmin) y que el artesano no tenga cuenta. Un solo link vivo por artesano:
 * revoca las vigentes previas. En BD se guarda solo el HASH del token; `email` va null
 * (el enlace se comparte a mano por WhatsApp/copiar, NUNCA por correo). Lanza si el insert falla.
 */
export async function generarEnlaceInvitacion(
  supabase: SupabaseClient,
  artesanoId: string,
  creadaPor: string,
  hostHeader?: string | null,
): Promise<{ link: string; expiraEn: string }> {
  const token = generarToken();
  const expira = expiraEn();
  await supabase
    .from("invitaciones")
    .update({ revocada_en: new Date().toISOString() })
    .eq("artesano_id", artesanoId)
    .is("usado_en", null)
    .is("revocada_en", null);
  const { error } = await supabase.from("invitaciones").insert({
    artesano_id: artesanoId,
    token_hash: hashToken(token),
    email: null,
    expira_en: expira.toISOString(),
    creada_por: creadaPor,
  });
  if (error) throw new Error(error.message);
  return { link: linkDeInvitacion(token, hostHeader), expiraEn: expira.toISOString() };
}

/**
 * Invitación de REGISTRO (0013): NO va ligada a un artesano previo. El admin solo genera
 * el link; el artesano se CREA al reclamar (el servicio service_role lo inserta con los
 * datos del registro autoguiado). `artesano_id` queda NULL y `proposito='registro'`.
 * Devuelve el link en claro UNA sola vez (en BD solo el hash).
 */
export async function generarInvitacionRegistro(
  supabase: SupabaseClient,
  creadaPor: string,
  hostHeader?: string | null,
): Promise<{ link: string; expiraEn: string }> {
  const token = generarToken();
  const expira = expiraEn();
  const { error } = await supabase.from("invitaciones").insert({
    artesano_id: null,
    token_hash: hashToken(token),
    email: null,
    expira_en: expira.toISOString(),
    creada_por: creadaPor,
    proposito: "registro",
  });
  if (error) throw new Error(error.message);
  return { link: linkDeInvitacion(token, hostHeader), expiraEn: expira.toISOString() };
}
