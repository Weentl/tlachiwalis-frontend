import "server-only";
import { requireVendedor } from "./auth";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export type Venta = {
  orderId: string;
  fecha: string;
  brutoCentavos: number;
  comisionCentavos: number;
  netoCentavos: number;
  status: string; // transferido | sin_cuenta | pendiente | fallido
};
export type ResumenVentas = {
  ventas: Venta[];
  numVentas: number;
  netoTransferidoCentavos: number;
  netoPendienteCentavos: number;
  brutoTotalCentavos: number;
  comisionTotalCentavos: number;
  netoTotalCentavos: number;
  netoMesCentavos: number; // neto del mes en curso
  numVentasMes: number;
  ticketPromedioCentavos: number; // bruto / nº ventas
  porMes: { label: string; value: number }[]; // neto por mes (últimos 6)
};

// Ventas (payouts) del vendedor. RLS: payouts_artesano limita a lo suyo.
export async function getVentasVendedor(now = new Date()): Promise<ResumenVentas> {
  const { supabase } = await requireVendedor();
  const { data } = await supabase
    .from("payouts")
    .select("order_id,bruto_centavos,comision_centavos,neto_centavos,status,created_at")
    .order("created_at", { ascending: false });

  const ventas: Venta[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    orderId: r.order_id as string,
    fecha: (r.created_at as string) ?? "",
    brutoCentavos: Number(r.bruto_centavos ?? 0),
    comisionCentavos: Number(r.comision_centavos ?? 0),
    netoCentavos: Number(r.neto_centavos ?? 0),
    status: (r.status as string) ?? "pendiente",
  }));

  const mesKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const curKey = mesKey(now);

  let netoTransferidoCentavos = 0, netoPendienteCentavos = 0;
  let brutoTotalCentavos = 0, comisionTotalCentavos = 0, netoTotalCentavos = 0;
  let netoMesCentavos = 0, numVentasMes = 0;
  for (const v of ventas) {
    brutoTotalCentavos += v.brutoCentavos;
    comisionTotalCentavos += v.comisionCentavos;
    netoTotalCentavos += v.netoCentavos;
    if (v.status === "transferido") netoTransferidoCentavos += v.netoCentavos;
    else netoPendienteCentavos += v.netoCentavos;
    if (v.fecha && mesKey(new Date(v.fecha)) === curKey) {
      netoMesCentavos += v.netoCentavos;
      numVentasMes++;
    }
  }

  // Neto por mes (últimos 6) para la gráfica.
  const porMes: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = mesKey(d);
    porMes.push({
      label: MESES[d.getMonth()],
      value: ventas.filter((v) => v.fecha && mesKey(new Date(v.fecha)) === k).reduce((s, v) => s + v.netoCentavos, 0),
    });
  }

  return {
    ventas,
    numVentas: ventas.length,
    netoTransferidoCentavos,
    netoPendienteCentavos,
    brutoTotalCentavos,
    comisionTotalCentavos,
    netoTotalCentavos,
    netoMesCentavos,
    numVentasMes,
    ticketPromedioCentavos: ventas.length ? Math.round(brutoTotalCentavos / ventas.length) : 0,
    porMes,
  };
}
