import "server-only";

// Estado de cobros del artesano, consultado EN VIVO a Stripe vía apps/api (que además lo
// persiste en la fila). Se usa en la página /vendedor/cobros para reflejar al instante el
// resultado del onboarding, sin depender solo del webhook.
export type EstadoCobros = {
  conectado: boolean; // ya tiene cuenta Connect creada
  cobrosHabilitados: boolean; // charges_enabled && payouts_enabled → puede vender
  detallesEnviados: boolean; // details_submitted → terminó el formulario (puede estar en revisión)
};

function apiBase(): string | null {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "") ??
    null
  );
}

/** Lee (y sincroniza) el estado de cobros. Best-effort: null si apps/api no responde. */
export async function leerEstadoCobros(artesanoId: string): Promise<EstadoCobros | null> {
  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/sellers/stripe/estado`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ artesanoId }),
      cache: "no-store",
    });
    const d = (await res.json().catch(() => null)) as
      | { ok?: boolean; conectado?: boolean; cobrosHabilitados?: boolean; detallesEnviados?: boolean }
      | null;
    if (!res.ok || !d?.ok) return null;
    return {
      conectado: Boolean(d.conectado),
      cobrosHabilitados: Boolean(d.cobrosHabilitados),
      detallesEnviados: Boolean(d.detallesEnviados),
    };
  } catch {
    return null;
  }
}

// Detalle NO sensible de la cuenta Connect para el panel ADMIN (Stripe no devuelve RFC/CLABE
// completos, solo *_provided + last4). Se lee en vivo en la página de VER artesano.
export type DetalleCobros = {
  conectado: boolean;
  businessType?: string | null;
  nombre?: string | null;
  email?: string | null;
  pais?: string | null;
  rfcRegistrado?: boolean;
  banco?: { nombre: string | null; last4: string | null } | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detallesEnviados?: boolean;
  requisitos?: string[];
};

// Correo de acceso (auth.users) del artesano — para el panel admin. Vía apps/api (service_role).
export async function leerEmailArtesano(artesanoId: string): Promise<string | null> {
  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/sellers/email`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ artesanoId }),
      cache: "no-store",
    });
    const d = (await res.json().catch(() => null)) as { ok?: boolean; email?: string | null } | null;
    if (!res.ok || !d?.ok) return null;
    return d.email ?? null;
  } catch {
    return null;
  }
}

export async function leerDetalleCobros(artesanoId: string): Promise<DetalleCobros | null> {
  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/sellers/stripe/detalle`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ artesanoId }),
      cache: "no-store",
    });
    const d = (await res.json().catch(() => null)) as (DetalleCobros & { ok?: boolean }) | null;
    if (!res.ok || !d?.ok) return null;
    return d;
  } catch {
    return null;
  }
}
