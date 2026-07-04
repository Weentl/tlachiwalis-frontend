import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-server";
import type { EstadoFulfillment } from "@/lib/pedidos/estados";

export type PedidoAdmin = {
  id: string; // fulfillment id
  orderId: string;
  estado: EstadoFulfillment;
  createdAt: string;
  artesano: string;
  compradorEmail: string | null;
  destinoCiudad: string | null;
  paqueteria: string | null;
  guia: string | null;
  piezas: string; // resumen "Taza ×1, Vasija ×2"
  brutoCentavos: number;
};

// Supervisión de todos los envíos (RLS is_admin() permite leer todo con el cliente de sesión).
export async function getPedidosAdmin(limit = 200): Promise<PedidoAdmin[]> {
  const sb = await createAdminClient();
  const { data: fData } = await sb
    .from("order_fulfillments")
    .select("id,order_id,artesano_id,estado,paqueteria,guia,created_at,direccion_envio")
    .order("created_at", { ascending: false })
    .limit(limit);
  const fulfil = (fData ?? []) as Record<string, unknown>[];
  if (fulfil.length === 0) return [];

  const orderIds = [...new Set(fulfil.map((f) => f.order_id as string))];
  const artIds = [...new Set(fulfil.map((f) => f.artesano_id as string).filter(Boolean))];

  const [{ data: iData }, { data: oData }, { data: aData }] = await Promise.all([
    sb.from("order_items").select("order_id,artesano_id,nombre,cantidad,subtotal_centavos").in("order_id", orderIds),
    sb.from("orders").select("id,email").in("id", orderIds),
    sb.from("artesanos").select("id,nombre").in("id", artIds),
  ]);

  const emailPorOrden = new Map(
    ((oData ?? []) as { id: string; email: string | null }[]).map((o) => [o.id, o.email]),
  );
  const nombrePorArt = new Map(
    ((aData ?? []) as { id: string; nombre: string }[]).map((a) => [a.id, a.nombre]),
  );
  // Ítems por (orden, artesano)
  const items = (iData ?? []) as { order_id: string; artesano_id: string | null; nombre: string; cantidad: number; subtotal_centavos: number }[];

  return fulfil.map((f) => {
    const oid = f.order_id as string;
    const aid = f.artesano_id as string;
    const propios = items.filter((it) => it.order_id === oid && it.artesano_id === aid);
    const dir = (f.direccion_envio as Record<string, unknown> | null) ?? null;
    return {
      id: f.id as string,
      orderId: oid,
      estado: (f.estado as EstadoFulfillment) ?? "por_validar",
      createdAt: (f.created_at as string) ?? "",
      artesano: nombrePorArt.get(aid) ?? "—",
      compradorEmail: emailPorOrden.get(oid) ?? null,
      destinoCiudad: dir
        ? [dir.ciudad, dir.estado].filter(Boolean).join(", ") || null
        : null,
      paqueteria: (f.paqueteria as string) ?? null,
      guia: (f.guia as string) ?? null,
      piezas: propios.map((it) => `${it.nombre} ×${it.cantidad}`).join(", ") || "—",
      brutoCentavos: propios.reduce((s, it) => s + it.subtotal_centavos, 0),
    };
  });
}
