import Link from "next/link";
import { BadgeCheck, Clock, Landmark, ShieldCheck, FileText, Building2 } from "lucide-react";
import { requireVendedor } from "@/lib/vendedor/auth";
import { getMiArtesano } from "@/lib/vendedor/perfil";
import { leerEstadoCobros } from "@/lib/vendedor/cobros";
import { getVentasVendedor } from "@/lib/vendedor/ventas";
import { formatMXN } from "@/lib/products";
import { HBars } from "@/components/admin/charts";
import { OnboardingCobrosEmbebido } from "@/components/vendedor/onboarding-cobros-embebido";

// Página de COBROS del vendedor (Fase 4). Arranca/continúa el onboarding de Stripe Connect y
// muestra el estado real (sincronizado en vivo). Sin cobros habilitados no puede PUBLICAR piezas.
export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { artesanoId } = await requireVendedor();
  const [artesano, sp, ventas] = await Promise.all([
    getMiArtesano(),
    searchParams,
    getVentasVendedor(),
  ]);

  // Sincroniza en vivo con Stripe (persiste en la fila). Si apps/api no responde, usa la fila.
  const estado = await leerEstadoCobros(artesanoId);
  const habilitado = estado?.cobrosHabilitados ?? artesano.cobros_habilitados;
  const conectado = estado?.conectado ?? Boolean(artesano.stripe_account_id);
  const enviado = estado?.detallesEnviados ?? artesano.cobros_detalles_enviados;
  const enRevision = conectado && enviado && !habilitado;
  const volvioDeStripe = sp.done === "1";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-barro">Cobros</p>
        <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">
          Cómo recibes tu dinero
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectamos tu cuenta con Stripe para poder pagarte tus ventas. Es requisito para
          publicar tus piezas.
        </p>
      </header>

      {/* Estado */}
      {habilitado ? (
        <>
          <div className="card-warm flex items-start gap-3 border-emerald-300/40 bg-emerald-50/60 px-6 py-5">
            <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <h2 className="font-grotesk text-base font-semibold text-foreground">
                Tus cobros están listos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ya puedes publicar tus piezas y recibir pagos. Te depositamos el neto de cada
                venta (después de comisión e impuestos) a tu cuenta.
              </p>
              <Link
                href="/vendedor/productos"
                className="mt-3 inline-flex text-sm font-medium text-tinto hover:underline"
              >
                Ir a mis piezas →
              </Link>
            </div>
          </div>

          {/* Modificar datos ya conectados (Stripe account_management embebido). */}
          <details className="card-warm px-6 py-5">
            <summary className="cursor-pointer select-none font-grotesk text-sm font-semibold text-foreground">
              Modificar mis datos de cobro
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Actualiza tu información fiscal o bancaria cuando lo necesites. Los cambios los
              revisa y valida Stripe.
            </p>
            <div className="mt-4">
              <OnboardingCobrosEmbebido modo="gestion" />
            </div>
          </details>
        </>
      ) : enRevision ? (
        <div className="card-warm flex items-start gap-3 border-amber-300/50 bg-amber-50 px-6 py-5">
          <Clock className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div className="flex-1">
            <h2 className="font-grotesk text-base font-semibold text-foreground">
              Stripe está revisando tus datos
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ya enviaste tu información. Stripe la está verificando; en cuanto la aprueben podrás
              publicar. Si te falta algún dato, continúa aquí:
            </p>
            <div className="mt-4">
              <OnboardingCobrosEmbebido />
            </div>
          </div>
        </div>
      ) : (
        <div className="card-warm px-6 py-6">
          {volvioDeStripe ? (
            <p className="mb-4 rounded-ob-sm border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Parece que aún no terminaste tu registro en Stripe. Puedes retomarlo cuando quieras.
            </p>
          ) : null}
          <h2 className="font-grotesk text-base font-semibold text-foreground">
            {conectado ? "Continúa tu registro de cobros" : "Conecta tus cobros"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stripe te pedirá tus datos fiscales y bancarios en una página segura. Tomas ~5 minutos.
            Mientras tanto puedes subir tus piezas, pero no podrás publicarlas hasta terminar esto.
          </p>
          <div className="mt-5">
            <OnboardingCobrosEmbebido />
          </div>
        </div>
      )}

      {/* Mis ventas (reflejo del checkout) — desglose con KPIs y gráfica */}
      <section className="card-warm px-6 py-5">
        <div className="flex items-center justify-between">
          <h3 className="font-grotesk text-sm font-semibold text-foreground">Mis ventas</h3>
          <span className="text-xs text-muted-foreground">
            {ventas.numVentas} {ventas.numVentas === 1 ? "venta" : "ventas"} · histórico
          </span>
        </div>

        {/* KPIs de venta */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <VKpi label="Neto del mes" value={formatMXN(ventas.netoMesCentavos / 100)} sub={`${ventas.numVentasMes} ${ventas.numVentasMes === 1 ? "venta" : "ventas"}`} />
          <VKpi label="Ticket promedio" value={formatMXN(ventas.ticketPromedioCentavos / 100)} />
          <VKpi label="Neto total" value={formatMXN(ventas.netoTotalCentavos / 100)} />
          <VKpi label="Comisión total (10%)" value={formatMXN(ventas.comisionTotalCentavos / 100)} />
        </div>

        {/* Gráfica: neto por mes */}
        {ventas.numVentas > 0 ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Neto por mes (últimos 6)</p>
            <HBars data={ventas.porMes} />
          </div>
        ) : null}

        {/* Estado de depósitos */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <VKpi label="Depositado" value={formatMXN(ventas.netoTransferidoCentavos / 100)} />
          <VKpi label="Por depositar" value={formatMXN(ventas.netoPendienteCentavos / 100)} />
        </div>

        {/* Detalle de ventas */}
        {ventas.ventas.length > 0 ? (
          <ul className="mt-5 divide-y divide-tinto/10 text-sm">
            {ventas.ventas.slice(0, 8).map((v, i) => (
              <li key={`${v.orderId}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="text-muted-foreground">
                  {v.fecha ? new Date(v.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : ""}
                  {" · "}
                  <span className="text-foreground">neto {formatMXN(v.netoCentavos / 100)}</span>{" "}
                  <span className="text-xs">(bruto {formatMXN(v.brutoCentavos / 100)} − comisión {formatMXN(v.comisionCentavos / 100)})</span>
                </span>
                <span
                  className={
                    v.status === "transferido"
                      ? "shrink-0 text-xs font-medium text-emerald-600"
                      : v.status === "sin_cuenta"
                        ? "shrink-0 text-xs font-medium text-amber-600"
                        : "shrink-0 text-xs font-medium text-muted-foreground"
                  }
                >
                  {v.status === "transferido"
                    ? "Depositado"
                    : v.status === "sin_cuenta"
                      ? "Conecta cobros"
                      : v.status === "fallido"
                        ? "Falló"
                        : "Pendiente"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Aún no tienes ventas. Cuando alguien compre tus piezas, aparecerán aquí con su depósito y su
            desglose (bruto − comisión = neto).
          </p>
        )}
      </section>

      {/* Qué vas a necesitar / cómo funciona */}
      <section className="card-warm px-6 py-5">
        <h3 className="font-grotesk text-sm font-semibold text-foreground">Qué vas a necesitar</h3>
        <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2.5">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-barro" />
            <span>
              <span className="font-medium text-foreground">RFC y régimen fiscal.</span> Con RFC la
              retención de impuestos es mucho menor.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-barro" />
            <span>
              <span className="font-medium text-foreground">CLABE interbancaria.</span> A esa cuenta
              te depositamos tus ventas.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-barro" />
            <span>
              <span className="font-medium text-foreground">Tus datos personales o del taller</span>{" "}
              (nombre, domicilio) para verificación.
            </span>
          </li>
        </ul>
        <div className="mt-5 flex items-start gap-2.5 rounded-ob-sm border border-tinto/12 bg-tinto/[0.02] px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tinto" />
          <span>
            Tus datos fiscales y bancarios los guarda <span className="font-medium">Stripe</span>,
            no Tlachiwalis. Nosotros cobramos la venta, retenemos tus impuestos ante el SAT y te
            depositamos el neto.
          </span>
        </div>
      </section>
    </div>
  );
}

function VKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-ob-sm border border-tinto/10 bg-tinto/[0.02] px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-grotesk text-lg font-bold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-[0.68rem] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
