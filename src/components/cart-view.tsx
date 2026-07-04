"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatMXN } from "@/lib/products";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";

export function CartView() {
  const { items, remove, setQty, total, count } = useCart();

  if (count === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-3xl text-tinta">Tu carrito está vacío</p>
        <p className="mx-auto mt-3 max-w-sm text-ceniza">Aún no has agregado piezas.</p>
        <Link
          href="/tienda"
          className={cn(botonCls({ variant: "primary", size: "lg", pill: true }), "mt-7")}
        >
          Ver la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <ul className="divide-y divide-linea border-y border-linea lg:col-span-2">
        {items.map((item) => {
          const { product, qty, variante } = item;
          const precio = variante?.precio ?? product.precio;
          const opciones = variante ? Object.values(variante.opciones).join(" · ") : null;
          return (
            <li key={item.key} className="flex gap-5 py-6">
              <Link
                href={`/tienda/${product.id}`}
                className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[14px] bg-arena"
              >
                <Image src={product.img} alt={product.nombre} fill sizes="96px" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link
                  href={`/tienda/${product.id}`}
                  className="font-display text-xl leading-tight text-tinta transition-colors hover:text-grana"
                >
                  {product.nombre}
                </Link>
                <p className="mt-0.5 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-ceniza">
                  {product.maker} · {product.region}
                </p>
                {opciones ? <p className="mt-1 text-sm text-grana">{opciones}</p> : null}
                <div className="mt-auto flex items-center rounded-full border border-linea self-start pt-0">
                  <button type="button" onClick={() => setQty(item.key, qty - 1)} aria-label="Quitar uno" className="grid h-9 w-9 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums text-tinta">{qty}</span>
                  <button type="button" onClick={() => setQty(item.key, qty + 1)} aria-label="Agregar uno" className="grid h-9 w-9 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <p className="font-sans text-lg font-semibold tabular-nums text-tinta">
                  {formatMXN(precio * qty)}
                </p>
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  className="text-sm text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
                >
                  Quitar
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside>
        <div className="rounded-[20px] border border-linea bg-lino p-6 shadow-pieza">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ceniza">
              Subtotal
            </span>
            <span className="font-display text-2xl tabular-nums text-tinta">
              {formatMXN(total)}
              <span className="ml-1 align-middle font-sans text-sm text-ceniza">MXN</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-ceniza">El envío se calcula al pagar.</p>
          <button
            type="button"
            className={cn(botonCls({ variant: "primary", size: "lg", pill: true }), "mt-6 w-full")}
          >
            Proceder al pago
          </button>
          <p className="mt-3 text-center text-xs text-ceniza">Pago seguro · próximamente</p>
        </div>
      </aside>
    </div>
  );
}
