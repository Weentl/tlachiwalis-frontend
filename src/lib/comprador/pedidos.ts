import "server-only";
import { requireComprador } from "./auth";

export type PedidoItem = {
  nombre: string;
  opciones: Record<string, string>;
  cantidad: number;
  subtotalCentavos: number;
};
export type Pedido = {
  id: string;
  status: string;
  totalCentavos: number;
  createdAt: string;
  items: PedidoItem[];
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

  return os.map((o) => ({
    id: o.id as string,
    status: (o.status as string) ?? "pendiente",
    totalCentavos: Number(o.total_centavos ?? 0),
    createdAt: (o.created_at as string) ?? "",
    items: porOrden.get(o.id as string) ?? [],
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
  return {
    id: o.id as string,
    status: (o.status as string) ?? "pendiente",
    totalCentavos: Number((o as { total_centavos?: number }).total_centavos ?? 0),
    createdAt: (o as { created_at?: string }).created_at ?? "",
    items: porOrden.get(o.id as string) ?? [],
  };
}
