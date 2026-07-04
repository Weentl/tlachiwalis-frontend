import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingBag,
  Wallet,
  Receipt,
  Coins,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { listarProductos } from "@/lib/admin/productos";
import { listarArtesanos } from "@/lib/admin/artesanos";
import { fmtPesos, COMISION_RATE, type Orden } from "@/lib/admin/metrics";
import { getMetricsReales } from "@/lib/admin/metrics-reales";
import { StatCard } from "@/components/admin/stat-card";
import { Donut, HBars, StackedBar } from "@/components/admin/charts";
import { SalesChart } from "@/components/admin/sales-chart";

const ORDEN_COLOR: Record<Orden["estatus"], string> = {
  pendiente: "#c9a24b",
  entregado: "#57211d",
  enviado: "#b45f39",
  pagado: "#8c7c68",
  cancelado: "#9a2a22",
};

export default async function DashboardPage() {
  await requireAdmin();
  const [productos, artesanos] = await Promise.all([
    listarProductos(),
    listarArtesanos(),
  ]);
  const m = await getMetricsReales(productos, artesanos, new Date());

  const ingreso = [
    { label: "Neto a artesanos", value: m.netoMes, color: "#57211d" },
    { label: "Comisión plataforma", value: m.comisionMes, color: "#b45f39" },
  ];

  // Tendencia HONESTA: %↑/↓ solo si hay mes previo con qué comparar; si no, un texto claro.
  const delta =
    m.deltaDir === "up" || m.deltaDir === "down" ? (
      <span className={`inline-flex items-center gap-1 ${m.deltaDir === "up" ? "text-[#3f7a4f]" : "text-destructive"}`}>
        {m.deltaDir === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        {Math.abs(m.deltaPct)}% <span className="text-muted-foreground">vs. mes previo</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3.5 w-3.5" /> {m.deltaTexto}
      </span>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-barro">
            Panel de control
          </p>
          <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">
            Resumen del sitio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado operativo y comercial de Tlachiwalis.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-tinto/15 bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Datos en vivo
        </span>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Ventas del mes" value={fmtPesos(m.gmvMes)} sub={delta} icon={<TrendingUp className="h-4 w-4" />} color="#57211d" />
        <StatCard label="Órdenes" value={m.ordenesMes.toLocaleString("es-MX")} icon={<ShoppingBag className="h-4 w-4" />} color="#b45f39" />
        <StatCard label="Ticket promedio" value={fmtPesos(m.aov)} icon={<Wallet className="h-4 w-4" />} color="#8c7c68" />
        <StatCard label={`Comisión ${Math.round(COMISION_RATE * 100)}%`} value={fmtPesos(m.comisionMes)} icon={<Receipt className="h-4 w-4" />} color="#b45f39" />
        <StatCard label="Neto a artesanos" value={fmtPesos(m.netoMes)} icon={<Coins className="h-4 w-4" />} color="#a8761f" />
      </div>

      {/* Ventas + distribución del ingreso */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-warm p-6 lg:col-span-2">
          <SalesChart series={m.ventasPorPeriodo} />
        </section>

        <section className="card-warm p-6">
          <h2 className="mb-4 font-grotesk text-base font-semibold text-foreground">
            Distribución del ingreso
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative">
              <Donut data={ingreso} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                  Mes
                </span>
                <span className="font-grotesk text-sm font-bold tabular-nums text-foreground">
                  {fmtPesos(m.gmvMes)}
                </span>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm">
              {ingreso.map((s) => (
                <li key={s.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Rankings + estado de órdenes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-warm p-6">
          <h2 className="mb-4 font-grotesk text-base font-semibold text-foreground">
            Ventas por oficio
          </h2>
          <HBars data={m.porOficio} />
        </section>
        <section className="card-warm p-6">
          <h2 className="mb-4 font-grotesk text-base font-semibold text-foreground">
            Top artesanos
          </h2>
          <HBars data={m.topArtesanos} />
        </section>
        <section className="card-warm p-6">
          <h2 className="mb-4 font-grotesk text-base font-semibold text-foreground">
            Estado de órdenes
          </h2>
          <StackedBar data={m.estadoOrdenes} />
        </section>
      </div>

      {/* Órdenes recientes + catálogo / alertas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-warm overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-tinto/10 px-6 py-4">
            <h2 className="font-grotesk text-base font-semibold text-foreground">
              Órdenes recientes
            </h2>
            <span className="text-xs text-muted-foreground">en vivo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-6 py-2.5 font-medium">Folio</th>
                  <th className="px-3 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Pieza</th>
                  <th className="px-3 py-2.5 font-medium">Total</th>
                  <th className="px-6 py-2.5 font-medium">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {m.ordenesRecientes.map((o) => (
                  <tr key={o.folio} className="border-t border-tinto/10 transition-colors hover:bg-tinto/[0.02]">
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{o.folio}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{o.fecha}</td>
                    <td className="px-3 py-3">
                      <span className="text-foreground">{o.pieza}</span>
                      <span className="block text-xs text-muted-foreground">{o.artesano}</span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-foreground">{fmtPesos(o.total)}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs capitalize text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORDEN_COLOR[o.estatus] }} />
                        {o.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card-warm p-6">
            <h2 className="mb-4 font-grotesk text-base font-semibold text-foreground">Catálogo</h2>
            <ul className="space-y-2.5 text-sm">
              <CatRow label="Publicadas" value={m.catalogo.publicadas} />
              <CatRow label="Borradores" value={m.catalogo.borradores} />
              <CatRow label="Agotadas" value={m.catalogo.agotadas} />
              <CatRow label="Artesanos" value={m.catalogo.artesanos} />
            </ul>
            <Link href="/admin/productos" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-tinto hover:underline">
              Ver catálogo <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className="card-warm border-destructive/20 bg-destructive/[0.03] p-6">
            <h2 className="mb-3 flex items-center gap-2 font-grotesk text-base font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Pendientes
            </h2>
            <ul className="space-y-2.5 text-sm">
              <CatRow label="Piezas agotadas / vendidas" value={m.alertas.agotadas} warn={m.alertas.agotadas > 0} />
              <CatRow label="Artesanos sin cobros" value={m.alertas.sinCobros} warn={m.alertas.sinCobros > 0} hint="no pueden vender" />
              <CatRow label="Talleres demo" value={m.alertas.demo} hint="exhibición, no comprables" />
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function CatRow({
  label,
  value,
  warn,
  hint,
}: {
  label: string;
  value: number;
  warn?: boolean;
  hint?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">
        {label}
        {hint ? <span className="ml-1.5 text-xs text-muted-foreground/60">({hint})</span> : null}
      </span>
      <span className={warn ? "font-semibold tabular-nums text-destructive" : "tabular-nums text-foreground"}>
        {value}
      </span>
    </li>
  );
}
