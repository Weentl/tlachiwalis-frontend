"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "@/lib/products";

// Variante elegida en el storefront (talla/color…). El precio EFECTIVO viaja aquí
// (base + delta ya resuelto en servidor); el carrito no recalcula precios del cliente.
export type CartVariante = {
  id: string;
  opciones: Record<string, string>;
  precio: number;
};

// Una línea del carrito. `key` distingue producto y —si aplica— variante, para que
// "Talla M" y "Talla G" de la misma pieza sean líneas separadas.
export type CartItem = {
  key: string;
  product: Product;
  qty: number;
  variante?: CartVariante;
};

type CartCtx = {
  items: CartItem[];
  add: (p: Product, variante?: CartVariante, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  /* Estado del cart drawer (slide-over). El header y el add-to-cart lo abren. */
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

const itemKey = (id: string, variante?: CartVariante) =>
  variante ? `${id}::${variante.id}` : id;
const precioDe = (i: CartItem) => i.variante?.precio ?? i.product.precio;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  // Cargar de localStorage al montar (con migración de ítems viejos sin `key`).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tlachiwalis-cart");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<CartItem>[];
      setItems(
        (Array.isArray(parsed) ? parsed : [])
          .filter((i) => i && i.product && typeof i.qty === "number")
          .map((i) => ({
            key: i.key ?? itemKey((i.product as Product).id, i.variante),
            product: i.product as Product,
            qty: i.qty as number,
            variante: i.variante,
          })),
      );
    } catch {
      /* ignore */
    }
  }, []);

  // Persistir
  useEffect(() => {
    try {
      localStorage.setItem("tlachiwalis-cart", JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const add = (p: Product, variante?: CartVariante, qty: number = 1) => {
    setItems((prev) => {
      const key = itemKey(p.id, variante);
      const n = Math.max(1, Math.floor(qty));
      const found = prev.find((i) => i.key === key);
      return found
        ? prev.map((i) => (i.key === key ? { ...i, qty: i.qty + n } : i))
        : [...prev, { key, product: p, qty: n, variante }];
    });
    setOpen(true); // agregar abre el drawer (firma "Manos")
  };

  const remove = (key: string) =>
    setItems((prev) => prev.filter((i) => i.key !== key));

  const clear = () => setItems([]);

  // Fija cantidad exacta (stepper del drawer). ≤0 quita la línea.
  const setQty = (key: string, qty: number) =>
    setItems((prev) => {
      const n = Math.floor(qty);
      return n <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, qty: n } : i));
    });

  const count = items.reduce((n, i) => n + i.qty, 0);
  const total = items.reduce((n, i) => n + i.qty * precioDe(i), 0);

  return (
    <Ctx.Provider
      value={{
        items,
        add,
        remove,
        setQty,
        clear,
        count,
        total,
        open,
        openCart: () => setOpen(true),
        closeCart: () => setOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return c;
}
