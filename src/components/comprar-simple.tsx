"use client";
import { useState } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { SelectorCantidad } from "@/components/selector-cantidad";
import type { Product } from "@/lib/products";

// Zona de compra para piezas SIN variantes:
//  - 'unico': una pieza, sin cantidad ("Llevar esta pieza").
//  - 'stock_simple': stepper de cantidad + disponibilidad.
// `disponible = null` = fallback estático (Supabase caído): tratar como disponible sin límite.
export function ComprarSimple({
  product,
  tipo,
  disponible,
  varianteId,
}: {
  product: Product;
  tipo: string;
  disponible: number | null;
  /** Variante default (única/stock): se lleva al carrito para el reparto en el checkout. */
  varianteId?: string;
}) {
  const esUnico = tipo === "unico";
  const agotado = disponible !== null && disponible <= 0;
  const [qty, setQty] = useState(1);
  const variante = varianteId
    ? { id: varianteId, opciones: {}, precio: product.precio }
    : undefined;

  return (
    <div className="mt-6 space-y-4">
      {esUnico ? (
        agotado ? (
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-linea bg-arena px-3.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ceniza">
              <span className="h-2 w-2 rounded-full bg-ceniza" aria-hidden />
              Vendida
            </p>
            <p className="mt-2 text-sm text-ceniza">Esta pieza única encontró su hogar.</p>
          </div>
        ) : (
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cempa/40 bg-cempa/10 px-3.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-tinta">
              <span className="h-2 w-2 rounded-full bg-cempa" aria-hidden />
              Pieza única · solo existe esta
            </p>
            <p className="mt-2 text-sm text-ceniza">Al comprarla, se retira de la tienda.</p>
          </div>
        )
      ) : disponible !== null && !agotado ? (
        <>
          <SelectorCantidad value={qty} onChange={setQty} max={disponible} />
          <p className={`flex items-center gap-2 text-sm ${disponible <= 3 ? "text-grana" : "text-ceniza"}`}>
            <span
              className={`h-2 w-2 rounded-full ${disponible <= 3 ? "bg-grana" : "bg-jade"}`}
              aria-hidden
            />
            {disponible <= 3 ? `Solo quedan ${disponible}.` : `${disponible} disponibles.`}
          </p>
        </>
      ) : null}

      <AddToCart
        product={product}
        variante={variante}
        qty={esUnico ? 1 : qty}
        disabled={agotado}
        disabledLabel={esUnico ? "Esta pieza encontró su hogar" : "Agotado"}
        label={esUnico ? "Llevar esta pieza" : "Agregar al carrito"}
      />
    </div>
  );
}
