import "server-only";

/**
 * PUNTO DE INTEGRACIÓN service_role — creación de la cuenta del artesano al
 * reclamar la invitación (claim). Ver docs/INVITACION_ACCESO.md §"Creación de la
 * cuenta (claim) sin SMTP".
 *
 * POR QUÉ ESTE HELPER EXISTE Y NO CREA EL USUARIO DIRECTO AQUÍ
 * -----------------------------------------------------------
 * Sin SMTP no podemos usar el flujo de "invite por email". Crear el usuario
 * requiere `auth.admin.createUser({ email_confirm: true })`, que SOLO funciona
 * con la SECRET key (service_role) — esa key BYPASSA RLS y por regla dura del
 * CLAUDE.md NUNCA vive en el frontend/bundle del cliente ni en este paquete web.
 *
 * Por eso el claim delega la creación de la cuenta a un servicio privilegiado:
 *   - PROD (Supabase Cloud): Edge Function `crear-vendedor` (service_role nativo).
 *   - DEV / self-hosted: endpoint en `apps/api` que porta SUPABASE_SERVICE_ROLE_KEY.
 *
 * Este archivo define el CONTRATO (tipos + un fetch al endpoint) y deja el punto
 * de integración marcado con TODO. NO contiene secretos.
 *
 * IDEMPOTENCIA (CLAUDE.md): el servicio privilegiado debe ligar user↔artesano de
 * forma idempotente. El respaldo real es `UNIQUE(artesanos.user_id)` + marcar la
 * invitación como usada dentro de la MISMA transacción del lado servidor: un
 * doble submit debe devolver el mismo usuario, nunca crear dos.
 */

export type ClaimServiceInput = {
  /** Token en claro reclamado (el servicio revalida hash + TTL + un-solo-uso). */
  token: string;
  email: string;
  password: string;
};

export type ClaimServiceResult =
  | { ok: true; userId: string; artesanoId: string }
  | { ok: false; error: string; code?: "expirada" | "usada" | "invalida" | "email_en_uso" };

/**
 * URL del servicio privilegiado que ejecuta el claim con service_role.
 * - Edge Function:  `${SUPABASE_URL}/functions/v1/crear-vendedor`
 * - apps/api:       `${API_INTERNAL_URL}/vendedores/claim`
 * Se resuelve por env; NO se hardcodea.
 */
function claimEndpoint(): string | null {
  return (
    process.env.CLAIM_SERVICE_URL ??
    (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/crear-vendedor`
      : null)
  );
}

/**
 * Crea la cuenta del artesano y la liga a su artesano vía el servicio con
 * service_role. Devuelve el resultado tipado; el Server Action del claim decide
 * cómo iniciar la sesión (signInWithPassword con el cliente cookie-bound).
 *
 * TODO(integración service_role): implementar el servicio destino:
 *   1) Edge Function `supabase/functions/crear-vendedor` (PROD, service_role nativo), o
 *   2) ruta en `apps/api` (`/vendedores/claim`) que use SUPABASE_SERVICE_ROLE_KEY.
 *   El servicio DEBE, en una transacción:
 *     a) revalidar la invitación por token_hash (no confiar en este cliente) con
 *        public.invitacion_valida (usado_en IS NULL AND revocada_en IS NULL AND
 *        expira_en > now()),
 *     b) `auth.admin.createUser({ email, password, email_confirm: true })`,
 *     c) `update artesanos set user_id = <nuevo> where id = <artesano_id de la invitación>`
 *        (whitelist: SOLO user_id; nunca status/comisión desde aquí),
 *     d) marcar la invitación usada: `update invitaciones set usado_en = now()`,
 *     e) responder { userId, artesanoId }.
 *   Autenticar la llamada con un secreto de servicio (CLAIM_SERVICE_TOKEN), no anon.
 */
export async function crearCuentaVendedor(
  input: ClaimServiceInput,
): Promise<ClaimServiceResult> {
  const endpoint = claimEndpoint();
  if (!endpoint) {
    // Punto de integración aún sin cablear (self-hosted sin service_role).
    return {
      ok: false,
      error:
        "El registro de artesanos aún no está disponible en este entorno. Avísale al equipo de Tlachiwalis.",
      code: "invalida",
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Secreto de servicio (NO la anon key). Lo valida el servicio destino.
        ...(process.env.CLAIM_SERVICE_TOKEN
          ? { authorization: `Bearer ${process.env.CLAIM_SERVICE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as ClaimServiceResult | null;
    if (!res.ok || !data) {
      return {
        ok: false,
        error:
          (data && "error" in data && data.error) ||
          "No se pudo crear tu cuenta. Intenta de nuevo en un momento.",
      };
    }
    return data;
  } catch {
    return {
      ok: false,
      error: "No se pudo crear tu cuenta. Intenta de nuevo en un momento.",
    };
  }
}
