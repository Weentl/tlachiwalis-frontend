"use server";
import { requireComprador } from "@/lib/comprador/auth";
import type { MetodoPago } from "@/lib/comprador/pagos";

function apiBase(): string | null {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "") ??
    null
  );
}

// Token del comprador + base de apps/api. Los métodos de pago se orquestan SIEMPRE en el
// backend (service_role + Stripe secret); el front nunca toca la Stripe secret ni el PAN.
async function tokenBase(): Promise<{ token: string; base: string } | null> {
  const { supabase } = await requireComprador();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const base = apiBase();
  if (!token || !base) return null;
  return { token, base };
}

export async function listarMetodosPago(): Promise<MetodoPago[]> {
  const tb = await tokenBase();
  if (!tb) return [];
  try {
    const res = await fetch(`${tb.base}/payments/payment-methods`, {
      headers: { authorization: `Bearer ${tb.token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; metodos?: MetodoPago[] }
      | null;
    return data?.ok && data.metodos ? data.metodos : [];
  } catch {
    return [];
  }
}

export async function iniciarGuardadoTarjeta(): Promise<string | null> {
  const tb = await tokenBase();
  if (!tb) return null;
  try {
    const res = await fetch(`${tb.base}/payments/setup-intent`, {
      method: "POST",
      headers: { authorization: `Bearer ${tb.token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; clientSecret?: string }
      | null;
    return data?.ok && data.clientSecret ? data.clientSecret : null;
  } catch {
    return null;
  }
}

async function postId(path: string, id: string): Promise<boolean> {
  const tb = await tokenBase();
  if (!tb) return false;
  try {
    const res = await fetch(`${tb.base}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${tb.token}`, "content-type": "application/json" },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function eliminarMetodoPago(id: string): Promise<boolean> {
  return postId("/payments/payment-methods/detach", id);
}

export async function hacerMetodoPredeterminado(id: string): Promise<boolean> {
  return postId("/payments/payment-methods/default", id);
}
