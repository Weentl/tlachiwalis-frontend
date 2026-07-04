import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutCliente } from "@/components/checkout/checkout-cliente";
import { requireComprador } from "@/lib/comprador/auth";

export const metadata: Metadata = { title: "Pagar · Tlachiwalis" };

export default async function CheckoutPage() {
  await requireComprador(); // gate: entra para pagar

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-20 md:pt-32">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">Checkout</p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Finaliza tu compra</h1>
        <div className="mt-8">
          <CheckoutCliente />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
