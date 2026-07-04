import "server-only";
import { requireVendedor } from "./auth";
import type { EstadoFulfillment } from "@/lib/pedidos/estados";

export type DireccionEnvio = {
  destinatario: string | null;
  telefono: string | null;
  calle: string | null;
  colonia: string | null;
  ciudad: string | null;
  estado: string | null;
  cp: string | null;
  referencias: string | null;
} | null;

export type PedidoItem = {
  nombre: string;
  opciones: Record<string, string>;
  cantidad: number;
  subtotalCentavos: number;
};

export type PedidoVendedor = {
  id: string; // fulfillment id
  orderId: string;
  estado: EstadoFulfillment;
  createdAt: string;
  paqueteria: string | null;
  guia: string | null;
  guiaUrl: string | null;
  nota: string | null;
  enviadoEn: string | null;
  entregadoEn: string | null;
  destino: DireccionEnvio;
  items: PedidoItem[];
  brutoCentavos: number;
};

// Pedidos que le tocan a ESTE artesano (RLS: fulfillments/items propios). Más recientes primero.
export async function getPedidosVendedor(): Promise<PedidoVendedor[]> {
  const { supabase, artesanoId } = await requireVendedor();
  const { data: fData } = await supabase
    .from("order_fulfillments")
    .select("id,order_id,estado,paqueteria,guia,guia_url,nota,enviado_en,entregado_en,created_at,direccion_envio")
    .eq("artesano_id", artesanoId)
    .order("created_at", { ascending: false });
  const fulfil = (fData ?? []) as Record<string, unknown>[];
  if (fulfil.length === 0) return [];

  const orderIds = [...new Set(fulfil.map((f) => f.order_id as string))];
  const { data: iData } = await supabase
    .from("order_items")
    .select("order_id,nombre,opciones,cantidad,subtotal_centavos")
    .in("order_id", orderIds)
    .eq("artesano_id", artesanoId);

  const itemsPorOrden = new Map<string, PedidoItem[]>();
  for (const r of (iData ?? []) as Record<string, unknown>[]) {
    const oid = r.order_id as string;
    const arr = itemsPorOrden.get(oid) ?? [];
    arr.push({
      nombre: (r.nombre as string) ?? "Pieza",
      opciones: (r.opciones as Record<string, string>) ?? {},
      cantidad: Number(r.cantidad ?? 1),
      subtotalCentavos: Number(r.subtotal_centavos ?? 0),
    });
    itemsPorOrden.set(oid, arr);
  }

  return fulfil.map((f) => {
    const items = itemsPorOrden.get(f.order_id as string) ?? [];
    return {
      id: f.id as string,
      orderId: f.order_id as string,
      estado: (f.estado as EstadoFulfillment) ?? "por_validar",
      createdAt: (f.created_at as string) ?? "",
      paqueteria: (f.paqueteria as string) ?? null,
      guia: (f.guia as string) ?? null,
      guiaUrl: (f.guia_url as string) ?? null,
      nota: (f.nota as string) ?? null,
      enviadoEn: (f.enviado_en as string) ?? null,
      entregadoEn: (f.entregado_en as string) ?? null,
      destino: (f.direccion_envio as DireccionEnvio) ?? null,
      items,
      brutoCentavos: items.reduce((s, it) => s + it.subtotalCentavos, 0),
    };
  });
}
