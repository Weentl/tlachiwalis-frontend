"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { formatMXN } from "@/lib/products";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";

/* CartDrawer — slide-over lateral. Reemplaza navegar a /carrito (que queda como
   fallback). El envío se calcula al pagar (el servidor es la autoridad de precios). */
export function CartDrawer() {
  const { open, closeCart, items, setQty, remove, total, count } = useCart();

  // ESC para cerrar + bloqueo de scroll del body mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, closeCart]);

  return (
    <div
      aria-hidden={!open}
      className={cn("fixed inset-0 z-[60]", open ? "" : "pointer-events-none")}
    >
      {/* Fondo */}
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Cerrar carrito"
        onClick={closeCart}
        className={cn(
          "absolute inset-0 bg-tinta/40 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Tu carrito"
        aria-modal={open}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cal shadow-alto transition-transform duration-300 ease-out sm:rounded-l-[24px]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-linea px-6 py-5">
          <div>
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">
              Tu carrito
            </p>
            <p className="font-display text-xl text-tinta">
              {count} {count === 1 ? "pieza" : "piezas"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar"
            className="grid h-10 w-10 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="font-display text-2xl text-tinta">Tu carrito está vacío</p>
            <p className="mt-2 max-w-xs text-sm text-ceniza">
              Aún no has agregado piezas. Explora los talleres y encuentra algo hecho a mano.
            </p>
            <Link
              href="/tienda"
              onClick={closeCart}
              className={cn(botonCls({ variant: "primary", size: "md", pill: true }), "mt-6")}
            >
              Ver la tienda
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-linea overflow-y-auto px-6">
              {items.map((item) => {
                const { product, qty, variante } = item;
                const precio = variante?.precio ?? product.precio;
                const opciones = variante
                  ? Object.values(variante.opciones).join(" · ")
                  : null;
                return (
                  <li key={item.key} className="flex gap-4 py-5">
                    <Link
                      href={`/tienda/${product.id}`}
                      onClick={closeCart}
                      className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[12px] bg-arena"
                    >
                      <Image src={product.img} alt={product.nombre} fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link
                        href={`/tienda/${product.id}`}
                        onClick={closeCart}
                        className="font-display text-lg leading-tight text-tinta transition-colors hover:text-grana"
                      >
                        {product.nombre}
                      </Link>
                      {opciones ? (
                        <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-ceniza">
                          {opciones}
                        </p>
                      ) : null}
                      <div className="mt-auto flex items-center gap-3 pt-2">
                        {/* Stepper */}
                        <div className="flex items-center rounded-full border border-linea">
                          <button
                            type="button"
                            onClick={() => setQty(item.key, qty - 1)}
                            aria-label="Quitar uno"
                            className="grid h-8 w-8 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
                          </button>
                          <span className="w-7 text-center text-sm tabular-nums text-tinta">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.key, qty + 1)}
                            aria-label="Agregar uno"
                            className="grid h-8 w-8 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.key)}
                          className="text-xs text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 font-sans text-sm font-semibold tabular-nums text-tinta">
                      {formatMXN(precio * qty)}
                    </p>
                  </li>
                );
              })}
            </ul>

            <footer className="border-t border-linea px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">
                  Subtotal
                </span>
                <span className="font-display text-2xl tabular-nums text-tinta">
                  {formatMXN(total)}
                  <span className="ml-1 align-middle font-sans text-sm text-ceniza">MXN</span>
                </span>
              </div>
              <p className="mt-1.5 text-xs text-ceniza">
                El envío se calcula al pagar.
              </p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className={cn(botonCls({ variant: "primary", size: "lg", pill: true }), "mt-4 w-full")}
              >
                Ir a pagar
              </Link>
              <button
                type="button"
                onClick={closeCart}
                className="mt-3 w-full text-center text-sm text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-tinta"
              >
                Seguir viendo
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
