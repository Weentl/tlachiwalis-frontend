import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AddCardForm } from "@/components/cuenta/add-card-form";
import { requireComprador } from "@/lib/comprador/auth";
import { iniciarGuardadoTarjeta } from "@/app/cuenta/pagos-actions";

export const metadata: Metadata = { title: "Agregar tarjeta · Tlachiwalis" };

export default async function AgregarTarjetaPage() {
  await requireComprador();
  const clientSecret = await iniciarGuardadoTarjeta();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto w-full max-w-md flex-1 px-6 pt-28 pb-20 md:pt-32">
        <Link
          href="/cuenta"
          className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ceniza transition-colors hover:text-grana"
        >
          ← Volver a mi cuenta
        </Link>
        <h1 className="mt-5 font-display text-4xl leading-tight">Agregar tarjeta</h1>
        <p className="mt-3 text-sm text-ceniza">
          Guárdala para pagar más rápido. El número lo procesa y protege Stripe; nunca se guarda en
          Tlachiwalis.
        </p>

        <div className="mt-8">
          {clientSecret ? (
            <AddCardForm clientSecret={clientSecret} />
          ) : (
            <p className="rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              No se pudo iniciar el guardado de la tarjeta. Vuelve a intentarlo en un momento.
            </p>
          )}
        </div>

        <p className="mt-6 flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ceniza">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Pago seguro con Stripe
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
