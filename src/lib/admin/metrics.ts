import type { ProductoAdmin, ArtesanoAdmin } from "@/lib/admin/types";

// ───────────────────────── Reglas del negocio ─────────────────────────
// La plataforma cobra comisión sobre la venta y, como RETENEDOR ante el SAT,
// retiene ISR+IVA sobre la parte del artesano (con RFC ~10.5%, sin RFC ~36%),
// luego dispersa el neto. (Tasas placeholder hasta validar con contador.)
export const COMISION_RATE = 0.12;
const tasaRetencion = (rfc: string | null) => (rfc ? 0.105 : 0.36);

// Hash estable de string → 0..1 (para simular ventas SIN aleatoriedad por render).
function unit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function fmtPesos(centavos: number): string {
  return "$" + Math.round(centavos / 100).toLocaleString("es-MX");
}

// Forma compacta para ejes/etiquetas: $1.2M, $120k, $980.
export function fmtCompact(centavos: number): string {
  const p = centavos / 100;
  if (p >= 1_000_000)
    return "$" + (p / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + "M";
  if (p >= 1_000) return "$" + Math.round(p / 1000).toLocaleString("es-MX") + "k";
  return "$" + Math.round(p).toLocaleString("es-MX");
}

export type Orden = {
  folio: string;
  fecha: string;
  pieza: string;
  artesano: string;
  total: number;
  estatus: "pagado" | "enviado" | "entregado" | "cancelado";
};

export type Serie = { label: string; value: number };

export type Metrics = {
  meses: string[];
  ventasPorMes: number[];
  ventasPorPeriodo: { semana: Serie[]; mes: Serie[]; anio: Serie[] };
  gmvMes: number;
  gmvPrev: number;
  deltaPct: number;
  ordenesMes: number;
  aov: number;
  comisionMes: number;
  retencionMes: number;
  netoMes: number;
  gmvTotal: number;
  porOficio: Serie[];
  topArtesanos: Serie[];
  topPiezas: { nombre: string; unidades: number; gmv: number }[];
  ordenesRecientes: Orden[];
  estadoOrdenes: { label: string; value: number; color: string }[];
  catalogo: { publicadas: number; borradores: number; agotadas: number; artesanos: number };
  alertas: { agotadas: number; sinRfc: number; sinClabe: number };
};

export function computeMetrics(
  productos: ProductoAdmin[],
  artesanos: ArtesanoAdmin[],
  now: Date,
): Metrics {
  const N = 6;
  const meses: string[] = [];
  const keys: string[] = [];
  for (let i = N - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push(MESES[d.getMonth()]);
    keys.push(`${d.getFullYear()}-${d.getMonth()}`);
  }

  // Solo las piezas no-borrador "se venden".
  const vendibles = productos.filter((p) => p.status !== "borrador");
  const artById = new Map(artesanos.map((a) => [a.id, a]));

  const ventasPorMes = new Array<number>(N).fill(0);
  const oficioMap = new Map<string, number>();
  const artMap = new Map<string, number>();
  const piezas: { nombre: string; unidades: number; gmv: number }[] = [];

  let gmvTotal = 0;
  let gmvMes = 0;
  let gmvPrev = 0;
  let unidadesMes = 0;
  let retencionMes = 0;

  for (const p of vendibles) {
    const pop = 0.3 + unit(p.id) * 0.7; // popularidad estable 0.3..1
    let uTot = 0;
    let gTot = 0;
    keys.forEach((mk, idx) => {
      const u = Math.round((2 + unit(p.id + mk) * 14) * pop); // ~2..16 u/mes
      const rev = u * p.precio_centavos;
      ventasPorMes[idx] += rev;
      uTot += u;
      gTot += rev;
      if (idx === N - 1) {
        unidadesMes += u;
        gmvMes += rev;
        const base = rev * (1 - COMISION_RATE);
        const a = p.artesano_id ? artById.get(p.artesano_id) : undefined;
        retencionMes += base * tasaRetencion(a?.rfc ?? null);
      }
      if (idx === N - 2) gmvPrev += rev;
    });
    gmvTotal += gTot;
    oficioMap.set(p.oficio, (oficioMap.get(p.oficio) ?? 0) + gTot);
    artMap.set(p.artesano_id ?? "—", (artMap.get(p.artesano_id ?? "—") ?? 0) + gTot);
    piezas.push({ nombre: p.nombre, unidades: uTot, gmv: gTot });
  }

  retencionMes = Math.round(retencionMes);
  const comisionMes = Math.round(gmvMes * COMISION_RATE);
  const netoMes = gmvMes - comisionMes - retencionMes;
  const ordenesMes = Math.max(1, Math.round(unidadesMes / 2)); // ~2 piezas/orden
  const aov = Math.round(gmvMes / ordenesMes);
  const deltaPct = gmvPrev ? Math.round(((gmvMes - gmvPrev) / gmvPrev) * 100) : 0;

  const porOficio = [...oficioMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const topArtesanos = [...artMap.entries()]
    .map(([id, value]) => ({ label: artById.get(id)?.nombre ?? "Sin asignar", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topPiezas = piezas.sort((a, b) => b.gmv - a.gmv).slice(0, 5);

  const estList: Orden["estatus"][] = [
    "entregado", "enviado", "pagado", "entregado", "enviado", "entregado", "pagado", "cancelado",
  ];
  const ordenesRecientes: Orden[] = [...vendibles]
    .sort((a, b) => unit(b.id + "o") - unit(a.id + "o"))
    .slice(0, 8)
    .map((p, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 2 - 1);
      const a = p.artesano_id ? artById.get(p.artesano_id) : undefined;
      return {
        folio: "TLA-" + (1000 + Math.round(unit(p.id) * 8999)),
        fecha: d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
        pieza: p.nombre,
        artesano: a?.nombre ?? "—",
        total: p.precio_centavos * (1 + (i % 3)),
        estatus: estList[i % estList.length],
      };
    });

  const ent = Math.round(ordenesMes * 0.5);
  const env = Math.round(ordenesMes * 0.25);
  const pag = Math.round(ordenesMes * 0.2);
  const can = Math.max(0, ordenesMes - ent - env - pag);
  const estadoOrdenes = [
    { label: "Entregado", value: ent, color: "#57211d" },
    { label: "Enviado", value: env, color: "#b45f39" },
    { label: "Pagado", value: pag, color: "#8c7c68" },
    { label: "Cancelado", value: can, color: "#9a2a22" },
  ];

  const catalogo = {
    publicadas: productos.filter((p) => p.status === "publicado").length,
    borradores: productos.filter((p) => p.status === "borrador").length,
    agotadas: productos.filter((p) => p.status === "agotado").length,
    artesanos: artesanos.length,
  };
  const alertas = {
    agotadas: catalogo.agotadas,
    sinRfc: artesanos.filter((a) => !a.rfc).length,
    sinClabe: artesanos.filter((a) => !a.clabe).length,
  };

  // ── Series para la gráfica interactiva (semana / mes / año) ──
  // Simulación determinista por hash; el bucket "mes" del mes actual coincide
  // con gmvMes (misma fórmula y clave). El año = suma de sus 12 meses.
  const totalBucket = (key: string, escala: number) => {
    let t = 0;
    for (const p of vendibles) {
      const pop = 0.3 + unit(p.id) * 0.7;
      t += Math.round((2 + unit(p.id + key) * 14) * pop * escala) * p.precio_centavos;
    }
    return t;
  };
  const serieMes: Serie[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    serieMes.push({
      label: MESES[d.getMonth()],
      value: totalBucket(`${d.getFullYear()}-${d.getMonth()}`, 1),
    });
  }
  const serieSemana: Serie[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    serieSemana.push({
      label: `${d.getDate()} ${MESES[d.getMonth()]}`,
      value: totalBucket(`w-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, 0.23),
    });
  }
  const serieAnio: Serie[] = [];
  for (let i = 3; i >= 0; i--) {
    const y = now.getFullYear() - i;
    let t = 0;
    for (let mm = 0; mm < 12; mm++) t += totalBucket(`${y}-${mm}`, 1);
    serieAnio.push({ label: String(y), value: t });
  }
  const ventasPorPeriodo = { semana: serieSemana, mes: serieMes, anio: serieAnio };

  return {
    meses, ventasPorMes, ventasPorPeriodo, gmvMes, gmvPrev, deltaPct, ordenesMes, aov,
    comisionMes, retencionMes, netoMes, gmvTotal, porOficio, topArtesanos,
    topPiezas, ordenesRecientes, estadoOrdenes, catalogo, alertas,
  };
}
