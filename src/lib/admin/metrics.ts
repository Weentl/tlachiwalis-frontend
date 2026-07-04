// Tipos + formateadores de métricas del admin. Los DATOS reales los arma
// `lib/admin/metrics-reales.ts` (leyendo orders/order_items/payouts). El generador
// simulado anterior (computeMetrics) se retiró: ya no se usa.

export const COMISION_RATE = 0.1; // 10% — coincide con COMISION_BPS del backend (apps/api)

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
  estatus: "pendiente" | "pagado" | "enviado" | "entregado" | "cancelado";
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
  alertas: { agotadas: number; sinCobros: number; demo: number };
};
