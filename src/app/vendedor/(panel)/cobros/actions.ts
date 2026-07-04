"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireVendedor } from "@/lib/vendedor/auth";

// Base de apps/api (donde vive la SECRET de Stripe y service_role). Derivada igual que en el
// panel admin (purgarCuentaAuth): API_INTERNAL_URL o quitando el sufijo de CLAIM_SERVICE_URL.
function apiBase(): string | null {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "") ??
    null
  );
}

async function siteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Inicia el onboarding de cobros: apps/api crea (si falta) la cuenta Connect Express del
 * artesano y devuelve un Account Link. Redirige al artesano a la página HOSTED de Stripe, donde
 * captura sus datos fiscales/bancarios. Al volver, Stripe manda a /vendedor/cobros?done=1.
 * redirect() a URL externa lanza NEXT_REDIRECT → fuera de try/catch.
 */
export async function iniciarOnboardingStripe(
  _prev: { error?: string },
  _formData: FormData,
): Promise<{ error?: string }> {
  const { user, artesanoId } = await requireVendedor();
  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return { error: "Los cobros no están disponibles en este entorno." };

  const site = await siteUrl();
  let url: string | null = null;
  try {
    const res = await fetch(`${base}/sellers/stripe/onboarding`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        artesanoId,
        email: user.email,
        returnUrl: `${site}/vendedor/cobros?done=1`,
        refreshUrl: `${site}/vendedor/cobros`,
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; url?: string; error?: string }
      | null;
    if (!res.ok || !data?.ok || !data.url) {
      return { error: data?.error ?? "No se pudo conectar con Stripe. Intenta de nuevo." };
    }
    url = data.url;
  } catch {
    return { error: "No se pudo conectar con Stripe. Intenta de nuevo." };
  }
  redirect(url); // → página hosted de Stripe (URL externa)
}

/**
 * Sincroniza el estado de cobros con Stripe (además del webhook), útil al volver del onboarding.
 * Best-effort: nunca lanza; refresca el panel para reflejar cobros_habilitados.
 */
export async function sincronizarCobros(): Promise<void> {
  const { artesanoId } = await requireVendedor();
  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return;
  try {
    await fetch(`${base}/sellers/stripe/estado`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ artesanoId }),
      cache: "no-store",
    });
  } catch {
    /* apps/api caído: el webhook igual actualizará el estado. */
  }
  revalidatePath("/vendedor");
  revalidatePath("/vendedor/cobros");
}

/**
 * Devuelve el `client_secret` de una Account Session de Stripe para montar el onboarding
 * EMBEBIDO (Connect embedded components) dentro de /vendedor/cobros. Gated por requireVendedor
 * (solo el vendedor autenticado, sobre SU artesano — anti-IDOR). El client_secret es efímero y de
 * un solo uso: nunca se cachea ni se loguea; el SDK lo pide on-demand (puede llamarse varias veces).
 */
export async function obtenerClientSecretOnboarding(): Promise<{
  clientSecret?: string;
  error?: string;
}> {
  const { user, artesanoId } = await requireVendedor();
  const base = apiBase();
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return { error: "Los cobros no están disponibles en este entorno." };
  try {
    const res = await fetch(`${base}/sellers/stripe/account-session`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ artesanoId, email: user.email }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; clientSecret?: string; error?: string }
      | null;
    if (!res.ok || !data?.ok || !data.clientSecret) {
      return { error: data?.error ?? "No se pudo conectar con Stripe." };
    }
    return { clientSecret: data.clientSecret };
  } catch {
    return { error: "No se pudo conectar con Stripe. Intenta de nuevo." };
  }
}
