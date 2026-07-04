import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "Carrito · Tlachiwalis",
};

export default function CarritoPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto w-full max-w-7xl px-6 pt-28 pb-24 md:pt-32">
        <h1 className="font-display text-4xl sm:text-5xl">Carrito</h1>
        <div className="mt-10">
          <CartView />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
