"use server";
import { requireComprador } from "@/lib/comprador/auth";
import { clienteIp, estaBloqueado, registrarFallo } from "@/lib/admin/rate-limit";

function apiBase(): string | null {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "") ??
    null
  );
}

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

export type ItemCheckout = { productoId: string; varianteId: string; cantidad: number };

// Crea la orden + PaymentIntent en el backend (que recalcula precios desde la BD). Devuelve el
// client_secret para confirmar el pago en el cliente. El front NUNCA fija montos.
export async function iniciarCheckout(
  items: ItemCheckout[],
  idempotencyKey?: string,
): Promise<{ ok: true; clientSecret: string; orderId: string; total: number } | { ok: false; error: string }> {
  const ip = await clienteIp();
  if (estaBloqueado("checkout:" + ip)) {
    return { ok: false, error: "Demasiados intentos de pago. Espera un momento e inténtalo de nuevo." };
  }
  const tb = await tokenBase();
  if (!tb) return { ok: false, error: "No disponible en este entorno." };
  try {
    const res = await fetch(`${tb.base}/payments/checkout`, {
      method: "POST",
      headers: { authorization: `Bearer ${tb.token}`, "content-type": "application/json" },
      body: JSON.stringify({ items, idempotencyKey }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; clientSecret?: string; orderId?: string; total?: number; error?: string }
      | null;
    if (!res.ok || !data?.ok || !data.clientSecret || !data.orderId) {
      registrarFallo("checkout:" + ip);
      return { ok: false, error: data?.error ?? "No se pudo iniciar el pago." };
    }
    return { ok: true, clientSecret: data.clientSecret, orderId: data.orderId, total: data.total ?? 0 };
  } catch {
    registrarFallo("checkout:" + ip);
    return { ok: false, error: "No se pudo conectar con el pago." };
  }
}

// Finaliza la orden tras confirmar el pago (respaldo del webhook; idempotente).
export async function confirmarOrden(paymentIntentId: string): Promise<boolean> {
  const tb = await tokenBase();
  if (!tb) return false;
  try {
    const res = await fetch(`${tb.base}/payments/order/confirm`, {
      method: "POST",
      headers: { authorization: `Bearer ${tb.token}`, "content-type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}
