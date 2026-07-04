"use server";
import { z } from "zod";
import { requireComprador } from "@/lib/comprador/auth";
import { clienteIp, estaBloqueado, registrarFallo } from "@/lib/admin/rate-limit";
import type { Direccion } from "@/lib/comprador/perfil";

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

export type FacturacionCheckout = {
  rfc: string;
  razonSocial?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  cpFiscal?: string;
  email?: string;
};

export type CheckoutOpciones = {
  idempotencyKey?: string;
  direccionId?: string;
  facturacion?: FacturacionCheckout;
  guardarTarjeta?: boolean;
};

// Crea la orden + PaymentIntent en el backend (que recalcula precios desde la BD). Devuelve el
// client_secret para confirmar el pago en el cliente. El front NUNCA fija montos.
export async function iniciarCheckout(
  items: ItemCheckout[],
  opciones: CheckoutOpciones = {},
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
      body: JSON.stringify({
        items,
        idempotencyKey: opciones.idempotencyKey,
        direccionId: opciones.direccionId,
        facturacion: opciones.facturacion,
        guardarTarjeta: opciones.guardarTarjeta,
      }),
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

const dirSchema = z.object({
  etiqueta: z.string().trim().max(40).optional().default(""),
  destinatario: z.string().trim().max(120).optional().default(""),
  telefono: z.string().trim().max(20).optional().default(""),
  calle: z.string().trim().min(1, "Falta la calle y número.").max(160),
  colonia: z.string().trim().max(120).optional().default(""),
  ciudad: z.string().trim().min(1, "Falta la ciudad.").max(120),
  estado: z.string().trim().max(120).optional().default(""),
  cp: z.string().trim().max(10).optional().default(""),
  referencias: z.string().trim().max(300).optional().default(""),
});

// Agrega una dirección DURANTE el checkout y devuelve la fila creada (para seleccionarla sin
// recargar). Misma tabla/RLS que la gestión en /cuenta; user_id forzado por el servidor (anti-IDOR).
export async function agregarDireccionCheckout(
  input: Record<string, string>,
): Promise<{ ok: true; direccion: Direccion } | { ok: false; error: string }> {
  const parsed = dirSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dirección inválida." };
  }
  const { supabase, user } = await requireComprador();
  const d = parsed.data;
  const { data, error } = await supabase
    .from("direcciones")
    .insert({
      user_id: user.id,
      etiqueta: d.etiqueta || null,
      destinatario: d.destinatario || null,
      telefono: d.telefono || null,
      calle: d.calle,
      colonia: d.colonia || null,
      ciudad: d.ciudad,
      estado: d.estado || null,
      cp: d.cp || null,
      referencias: d.referencias || null,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo guardar la dirección." };
  const r = data as Record<string, unknown>;
  return {
    ok: true,
    direccion: {
      id: r.id as string,
      etiqueta: (r.etiqueta as string) ?? null,
      destinatario: (r.destinatario as string) ?? null,
      telefono: (r.telefono as string) ?? null,
      calle: (r.calle as string) ?? null,
      colonia: (r.colonia as string) ?? null,
      ciudad: (r.ciudad as string) ?? null,
      estado: (r.estado as string) ?? null,
      cp: (r.cp as string) ?? null,
      referencias: (r.referencias as string) ?? null,
      esPrincipal: Boolean(r.es_principal),
    },
  };
}

export type Cotizacion = {
  zona: "nacional" | "extendida";
  nombre: string;
  costoCentavos: number;
  diasMin: number;
  diasMax: number;
  requiereCoordinacion: boolean;
  nota: string | null;
  gratis: boolean;
};

// Cotiza el envío para MOSTRARLO (zona por CP de la dirección elegida + peso). El cobro real lo
// recalcula el backend en /payments/checkout con la misma lógica, así que es solo un estimado seguro.
export async function cotizarEnvio(
  direccionId: string,
  items: ItemCheckout[],
  subtotalCentavos: number,
): Promise<Cotizacion | null> {
  const tb = await tokenBase();
  if (!tb) return null;
  try {
    const res = await fetch(`${tb.base}/shipping/quote`, {
      method: "POST",
      headers: { authorization: `Bearer ${tb.token}`, "content-type": "application/json" },
      body: JSON.stringify({
        direccionId,
        items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
        subtotalCentavos,
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; cotizacion?: Cotizacion } | null;
    return data?.ok && data.cotizacion ? data.cotizacion : null;
  } catch {
    return null;
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
