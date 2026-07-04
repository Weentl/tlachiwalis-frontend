import "server-only";
import { createAdminClient } from "@/lib/supabase/admin-server";
import type { ProductoAdmin, ArtesanoAdmin } from "@/lib/admin/types";
import type { Metrics, Orden, Serie } from "./metrics";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Metrics + indicador de tendencia HONESTO (no un % inventado cuando no hay con qué comparar).
export type MetricsReales = Metrics & {
  deltaDir: "up" | "down" | "flat" | "none";
  deltaTexto: string | null;
};

type OrdRow = { id: string; total_centavos: number; comision_centavos: number; status: string; created_at: string };
type ItemRow = { order_id: string; producto_id: string | null; artesano_id: string | null; nombre: string; cantidad: number; subtotal_centavos: number };
type PayRow = { order_id: string; artesano_id: string | null; neto_centavos: number; status: string };

export async function getMetricsReales(
  productos: ProductoAdmin[],
  artesanos: ArtesanoAdmin[],
  now: Date,
): Promise<MetricsReales> {
  const sb = await createAdminClient();
  const [{ data: oData }, { data: iData }, { data: pData }] = await Promise.all([
    sb.from("orders").select("id,total_centavos,comision_centavos,status,created_at").order("created_at", { ascending: false }),
    sb.from("order_items").select("order_id,producto_id,artesano_id,nombre,cantidad,subtotal_centavos"),
    sb.from("payouts").select("order_id,artesano_id,neto_centavos,status"),
  ]);
  const orders = (oData ?? []) as OrdRow[];
  const items = (iData ?? []) as ItemRow[];
  const payouts = (pData ?? []) as PayRow[];

  const pagadas = orders.filter((o) => o.status === "pagada");
  const paidIds = new Set(pagadas.map((o) => o.id));
  const artById = new Map(artesanos.map((a) => [a.id, a]));
  const oficioByProd = new Map(productos.map((p) => [p.id, p.oficio]));
  const mesKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const curKey = mesKey(now);
  const prevKey = mesKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // GMV / comisión por mes (últimos 6)
  const N = 6;
  const meses: string[] = [];
  const keys: string[] = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push(MESES[d.getMonth()]);
    keys.push(mesKey(d));
  }
  const ventasPorMes = new Array<number>(N).fill(0);
  let gmvMes = 0, gmvPrev = 0, comisionMes = 0, ordenesMes = 0, gmvTotal = 0;
  for (const o of pagadas) {
    const k = mesKey(new Date(o.created_at));
    gmvTotal += o.total_centavos;
    const idx = keys.indexOf(k);
    if (idx >= 0) ventasPorMes[idx] += o.total_centavos;
    if (k === curKey) {
      gmvMes += o.total_centavos;
      comisionMes += o.comision_centavos;
      ordenesMes++;
    }
    if (k === prevKey) gmvPrev += o.total_centavos;
  }
  const retencionMes = 0; // fiscal diferido (checkout sin retenciones por ahora)
  const netoMes = gmvMes - comisionMes - retencionMes;
  const aov = ordenesMes ? Math.round(gmvMes / ordenesMes) : 0;

  // Tendencia HONESTA
  let deltaPct = 0;
  let deltaDir: MetricsReales["deltaDir"] = "none";
  let deltaTexto: string | null = null;
  if (gmvPrev > 0) {
    deltaPct = Math.round(((gmvMes - gmvPrev) / gmvPrev) * 100);
    deltaDir = deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";
    if (deltaDir === "flat") deltaTexto = "Sin cambios";
  } else if (gmvMes > 0) {
    deltaTexto = "Primer mes con ventas";
  } else {
    deltaTexto = "Sin ventas aún";
  }

  // Por oficio / top artesanos / top piezas (de las pagadas)
  const oficioMap = new Map<string, number>();
  const artMap = new Map<string, number>();
  const piezasMap = new Map<string, { nombre: string; unidades: number; gmv: number }>();
  for (const it of items) {
    if (!paidIds.has(it.order_id)) continue;
    const of = (it.producto_id && oficioByProd.get(it.producto_id)) || "Otro";
    oficioMap.set(of, (oficioMap.get(of) ?? 0) + it.subtotal_centavos);
    const pz = piezasMap.get(it.nombre) ?? { nombre: it.nombre, unidades: 0, gmv: 0 };
    pz.unidades += it.cantidad;
    pz.gmv += it.subtotal_centavos;
    piezasMap.set(it.nombre, pz);
  }
  for (const p of payouts) {
    if (!paidIds.has(p.order_id) || !p.artesano_id) continue;
    if (p.status === "sin_cuenta" || p.status === "fallido") continue; // solo lo dispersable
    artMap.set(p.artesano_id, (artMap.get(p.artesano_id) ?? 0) + p.neto_centavos);
  }
  const porOficio: Serie[] = [...oficioMap.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const topArtesanos: Serie[] = [...artMap.entries()]
    .map(([id, value]) => ({ label: artById.get(id)?.nombre ?? "Sin asignar", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topPiezas = [...piezasMap.values()].sort((a, b) => b.gmv - a.gmv).slice(0, 5);

  // Estado de órdenes (reales)
  const cnt = (s: string) => orders.filter((o) => o.status === s).length;
  const estadoOrdenes = [
    { label: "Pagadas", value: cnt("pagada"), color: "#57211d" },
    { label: "Pendientes", value: cnt("pendiente"), color: "#8c7c68" },
    { label: "No completadas", value: cnt("fallida"), color: "#9a2a22" },
  ];

  // Órdenes recientes (reales)
  const infoPorOrden = new Map<string, { pieza: string; artesano: string }>();
  for (const it of items) {
    if (infoPorOrden.has(it.order_id)) continue;
    const a = it.artesano_id ? artById.get(it.artesano_id) : undefined;
    infoPorOrden.set(it.order_id, { pieza: it.nombre, artesano: a?.nombre ?? "—" });
  }
  const ordenesRecientes: Orden[] = orders.slice(0, 8).map((o) => {
    const info = infoPorOrden.get(o.id) ?? { pieza: "—", artesano: "—" };
    return {
      folio: o.id.replace(/^ord_/, "").slice(0, 8),
      fecha: new Date(o.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
      pieza: info.pieza,
      artesano: info.artesano,
      total: o.total_centavos,
      estatus: (o.status === "pagada"
        ? "pagado"
        : o.status === "fallida" || o.status === "cancelada"
          ? "cancelado"
          : "pendiente") as Orden["estatus"],
    };
  });

  // Catálogo + alertas (reales)
  const catalogo = {
    publicadas: productos.filter((p) => p.status === "publicado").length,
    borradores: productos.filter((p) => p.status === "borrador").length,
    agotadas: productos.filter((p) => p.status === "agotado").length,
    artesanos: artesanos.length,
  };
  const alertas = {
    agotadas: catalogo.agotadas,
    // Artesanos REALES (con acceso, no demo) que aún no pueden cobrar → no pueden vender.
    sinCobros: artesanos.filter((a) => !a.es_demo && a.user_id && (!a.cobros_habilitados || !a.stripe_account_id)).length,
    demo: artesanos.filter((a) => a.es_demo).length,
  };

  // Series reales para la gráfica (semana / mes / año)
  const serieMes: Serie[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = mesKey(d);
    serieMes.push({
      label: MESES[d.getMonth()],
      value: pagadas.filter((o) => mesKey(new Date(o.created_at)) === k).reduce((s, o) => s + o.total_centavos, 0),
    });
  }
  const serieSemana: Serie[] = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    serieSemana.push({
      label: `${end.getDate()} ${MESES[end.getMonth()]}`,
      value: pagadas
        .filter((o) => {
          const t = new Date(o.created_at);
          return t > start && t <= end;
        })
        .reduce((s, o) => s + o.total_centavos, 0),
    });
  }
  const serieAnio: Serie[] = [];
  for (let i = 3; i >= 0; i--) {
    const y = now.getFullYear() - i;
    serieAnio.push({
      label: String(y),
      value: pagadas.filter((o) => new Date(o.created_at).getFullYear() === y).reduce((s, o) => s + o.total_centavos, 0),
    });
  }
  const ventasPorPeriodo = { semana: serieSemana, mes: serieMes, anio: serieAnio };

  return {
    meses,
    ventasPorMes,
    ventasPorPeriodo,
    gmvMes,
    gmvPrev,
    deltaPct,
    ordenesMes,
    aov,
    comisionMes,
    retencionMes,
    netoMes,
    gmvTotal,
    porOficio,
    topArtesanos,
    topPiezas,
    ordenesRecientes,
    estadoOrdenes,
    catalogo,
    alertas,
    deltaDir,
    deltaTexto,
  };
}
