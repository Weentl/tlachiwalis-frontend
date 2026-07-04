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
}: {
  product: Product;
  tipo: string;
  disponible: number | null;
}) {
  const esUnico = tipo === "unico";
  const agotado = disponible !== null && disponible <= 0;
  const [qty, setQty] = useState(1);

  return (
    <div className="mt-6 space-y-4">
      {esUnico ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-grana/10 px-3.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-grana">
          Pieza única · ejemplar irrepetible
        </p>
      ) : disponible !== null && !agotado ? (
        <>
          <SelectorCantidad value={qty} onChange={setQty} max={disponible} />
          <p className={`text-sm ${disponible <= 3 ? "text-grana" : "text-ceniza"}`}>
            {disponible <= 3 ? `Solo quedan ${disponible}.` : `${disponible} disponibles.`}
          </p>
        </>
      ) : null}

      <AddToCart
        product={product}
        qty={esUnico ? 1 : qty}
        disabled={agotado}
        disabledLabel={esUnico ? "Esta pieza encontró su hogar" : "Agotado"}
        label={esUnico ? "Llevar esta pieza" : "Agregar al carrito"}
      />
    </div>
  );
}
