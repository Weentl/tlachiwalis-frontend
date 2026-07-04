import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";
import { formatMXN } from "@/lib/products";
import { requireComprador } from "@/lib/comprador/auth";
import { getPedido } from "@/lib/comprador/pedidos";

export const metadata: Metadata = { title: "¡Gracias! · Tlachiwalis" };

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  await requireComprador();
  const sp = await searchParams;
  const pedido = sp.order ? await getPedido(sp.order) : null;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-28 pb-20 text-center md:pt-32">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-jade/12 text-jade">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">¡Gracias por tu compra!</h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ceniza">
          Tu pago se realizó y el pedido llegó directo al taller. Le compraste a las manos que la
          hicieron — así se mantiene vivo el oficio.
        </p>

        {pedido ? (
          <div className="mx-auto mt-8 max-w-sm rounded-[18px] border border-linea bg-lino p-5 text-left shadow-pieza">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ceniza">
                Pedido
              </span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-jade">
                {pedido.status === "pagada" ? "Pagado" : pedido.status}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-linea">
              {pedido.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-4 py-2 text-sm">
                  <span className="text-tinta">
                    {it.cantidad}× {it.nombre}
                    {Object.values(it.opciones).length ? (
                      <span className="text-ceniza"> · {Object.values(it.opciones).join(" · ")}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-tinta">{formatMXN(it.subtotalCentavos / 100)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-linea pt-3">
              <span className="text-sm text-ceniza">Total</span>
              <span className="font-display text-xl tabular-nums text-tinta">
                {formatMXN(pedido.totalCentavos / 100)} <span className="text-sm text-ceniza">MXN</span>
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/cuenta" className={botonCls({ size: "lg", pill: true })}>
            Ver mis pedidos
          </Link>
          <Link
            href="/tienda"
            className="text-base text-grana underline decoration-grana/40 underline-offset-4 hover:decoration-grana"
          >
            Seguir explorando →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
