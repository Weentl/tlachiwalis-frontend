import "server-only";
import { requireComprador } from "./auth";
import type { EstadoFulfillment } from "@/lib/pedidos/estados";

export type PedidoItem = {
  nombre: string;
  opciones: Record<string, string>;
  cantidad: number;
  subtotalCentavos: number;
};
export type FulfillmentComprador = {
  estado: EstadoFulfillment;
  paqueteria: string | null;
  guia: string | null;
  guiaUrl: string | null;
  enviadoEn: string | null;
  entregadoEn: string | null;
};
export type Pedido = {
  id: string;
  status: string;
  totalCentavos: number;
  createdAt: string;
  items: PedidoItem[];
  fulfillments: FulfillmentComprador[];
};

function mapItems(rows: Record<string, unknown>[]): Map<string, PedidoItem[]> {
  const m = new Map<string, PedidoItem[]>();
  for (const r of rows) {
    const oid = r.order_id as string;
    const arr = m.get(oid) ?? [];
    arr.push({
      nombre: (r.nombre as string) ?? "Pieza",
      opciones: (r.opciones as Record<string, string>) ?? {},
      cantidad: Number(r.cantidad ?? 1),
      subtotalCentavos: Number(r.subtotal_centavos ?? 0),
    });
    m.set(oid, arr);
  }
  return m;
}

function mapFulfillments(rows: Record<string, unknown>[]): Map<string, FulfillmentComprador[]> {
  const m = new Map<string, FulfillmentComprador[]>();
  for (const r of rows) {
    const oid = r.order_id as string;
    const arr = m.get(oid) ?? [];
    arr.push({
      estado: (r.estado as EstadoFulfillment) ?? "por_validar",
      paqueteria: (r.paqueteria as string) ?? null,
      guia: (r.guia as string) ?? null,
      guiaUrl: (r.guia_url as string) ?? null,
      enviadoEn: (r.enviado_en as string) ?? null,
      entregadoEn: (r.entregado_en as string) ?? null,
    });
    m.set(oid, arr);
  }
  return m;
}

// Seguimiento (fulfillments) del comprador para un conjunto de órdenes. RLS: solo las de sus órdenes.
async function fulfillmentsPorOrden(
  supabase: Awaited<ReturnType<typeof requireComprador>>["supabase"],
  ids: string[],
): Promise<Map<string, FulfillmentComprador[]>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("order_fulfillments")
    .select("order_id,estado,paqueteria,guia,guia_url,enviado_en,entregado_en")
    .in("order_id", ids);
  return mapFulfillments((data ?? []) as Record<string, unknown>[]);
}

// Órdenes del comprador (RLS: solo las suyas). Más recientes primero.
export async function getPedidos(): Promise<Pedido[]> {
  const { supabase, user } = await requireComprador();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,status,total_centavos,created_at")
    .eq("comprador_id", user.id)
    .order("created_at", { ascending: false });
  const os = (orders ?? []) as Record<string, unknown>[];
  if (os.length === 0) return [];

  const ids = os.map((o) => o.id as string);
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id,nombre,opciones,cantidad,subtotal_centavos")
    .in("order_id", ids);
  const porOrden = mapItems((items ?? []) as Record<string, unknown>[]);
  const fPorOrden = await fulfillmentsPorOrden(supabase, ids);

  return os.map((o) => ({
    id: o.id as string,
    status: (o.status as string) ?? "pendiente",
    totalCentavos: Number(o.total_centavos ?? 0),
    createdAt: (o.created_at as string) ?? "",
    items: porOrden.get(o.id as string) ?? [],
    fulfillments: fPorOrden.get(o.id as string) ?? [],
  }));
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const { supabase, user } = await requireComprador();
  const { data: o } = await supabase
    .from("orders")
    .select("id,status,total_centavos,created_at,comprador_id")
    .eq("id", id)
    .maybeSingle();
  if (!o || (o as { comprador_id?: string }).comprador_id !== user.id) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id,nombre,opciones,cantidad,subtotal_centavos")
    .eq("order_id", id);
  const porOrden = mapItems((items ?? []) as Record<string, unknown>[]);
  const fPorOrden = await fulfillmentsPorOrden(supabase, [id]);
  return {
    id: o.id as string,
    status: (o.status as string) ?? "pendiente",
    totalCentavos: Number((o as { total_centavos?: number }).total_centavos ?? 0),
    createdAt: (o as { created_at?: string }).created_at ?? "",
    items: porOrden.get(o.id as string) ?? [],
    fulfillments: fPorOrden.get(o.id as string) ?? [],
  };
}
