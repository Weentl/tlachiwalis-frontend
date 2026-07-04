"use client";

import { useState } from "react";
import { useCart, type CartVariante } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";

export function AddToCart({
  product,
  variante,
  disabled = false,
  disabledLabel,
  qty = 1,
  label = "Agregar al carrito",
}: {
  product: Product;
  /** Variante elegida (si la pieza tiene talla/color). Sin ella = pieza única. */
  variante?: CartVariante;
  disabled?: boolean;
  /** Texto cuando está deshabilitado (p.ej. "Elige tus opciones" / "Agotado"). */
  disabledLabel?: string;
  /** Cantidad a agregar (stock_simple usa el selector). */
  qty?: number;
  /** Texto del CTA en estado normal (p.ej. "Llevar esta pieza" para pieza única). */
  label?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        add(product, variante, qty);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      className={cn(
        botonCls({ variant: "primary", size: "lg", pill: true }),
        "mt-7 w-full",
        disabled && "cursor-not-allowed",
      )}
    >
      {disabled && disabledLabel ? disabledLabel : added ? "Añadido ✓" : label}
    </button>
  );
}
