"use client";
import { useState } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { SelectorCantidad } from "@/components/selector-cantidad";
import { formatMXN, type Product } from "@/lib/products";
import type { EjeVar, VariantePieza } from "@/lib/tienda-detalle";

// Selector de variante: el comprador elige los ejes (talla/color…), se resuelve la variante
// exacta, su precio (servidor, nunca recalculado en cliente) y disponibilidad, y se agrega ESA
// variante con cantidad. Las combinaciones sin stock se tachan/deshabilitan; el precio pasa de
// "desde X" a exacto al resolver.
export function SelectorVariante({
  product,
  ejes,
  variantes,
  precioDesde,
}: {
  product: Product;
  ejes: EjeVar[];
  variantes: VariantePieza[];
  precioDesde: number;
}) {
  // Auto-selecciona los ejes que tienen UNA sola opción (evita el "click muerto":
  // p.ej. un tapete con un único color ya abre resuelto, con precio y stepper).
  const [sel, setSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ejes.filter((e) => e.opciones.length === 1).map((e) => [e.codigo, e.opciones[0].valor]),
    ),
  );
  const [qty, setQty] = useState(1);

  const completo = ejes.every((e) => sel[e.codigo]);
  const variante = completo
    ? variantes.find((v) => ejes.every((e) => v.opciones[e.codigo] === sel[e.codigo]))
    : undefined;
  const disponible = variante?.disponible ?? 0;
  const agotado = completo && (!variante || disponible <= 0);
  const faltan = ejes.filter((e) => !sel[e.codigo]).map((e) => e.nombre.toLowerCase());

  // ¿Hay alguna variante CON STOCK que use (codigo=valor) y respete lo ya elegido en otros ejes?
  const alcanzable = (codigo: string, valor: string) =>
    variantes.some(
      (v) =>
        v.opciones[codigo] === valor &&
        v.disponible > 0 &&
        ejes.every((e) => e.codigo === codigo || !sel[e.codigo] || v.opciones[e.codigo] === sel[e.codigo]),
    );

  const setEje = (codigo: string, valor: string) => {
    setSel((s) => ({ ...s, [codigo]: valor }));
    setQty(1);
  };

  return (
    <div className="mt-6 space-y-5">
      {/* Precio reactivo: "desde X" → exacto al resolver la variante. */}
      <p aria-live="polite" className="font-display text-3xl tabular-nums text-grana transition-opacity duration-200">
        {variante ? (
          formatMXN(variante.precio)
        ) : (
          <>
            <span className="font-mono text-sm uppercase tracking-[0.08em] text-ceniza">
              desde{" "}
            </span>
            {formatMXN(precioDesde)}
          </>
        )}
        <span className="ml-1.5 align-middle font-sans text-base text-ceniza">MXN</span>
      </p>

      {ejes.map((e) => {
        const esColor = e.opciones.some((o) => o.hex);
        const elegido = e.opciones.find((o) => o.valor === sel[e.codigo]);
        return (
          <div key={e.codigo}>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-ceniza">
              {e.nombre}
              {elegido ? <span className="text-tinta">: {elegido.etiqueta}</span> : null}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {e.opciones.map((o) => {
                const activo = sel[e.codigo] === o.valor;
                const ok = alcanzable(e.codigo, o.valor);
                const bloqueado = !ok && !activo;

                if (esColor) {
                  // Swatch como PILL: punto de color + nombre (legible en touch, mismo estado
                  // activo/agotado que las tallas). Multicolor (sin hex) usa un punto degradado.
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => setEje(e.codigo, o.valor)}
                      disabled={bloqueado}
                      aria-pressed={activo}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                        activo
                          ? "border-grana bg-grana/10 text-grana"
                          : bloqueado
                            ? "border-linea text-ceniza/50 line-through"
                            : "border-linea text-tinta hover:border-ceniza/50 hover:bg-arena/50"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border border-black/10 ${bloqueado ? "opacity-40" : ""}`}
                        style={{
                          background: o.hex ?? "conic-gradient(#a32929,#d9a441,#3f6b47,#2a4d7a,#a32929)",
                        }}
                        aria-hidden
                      />
                      {o.etiqueta}
                    </button>
                  );
                }
                return (
                  <button
                    key={o.valor}
                    type="button"
                    onClick={() => setEje(e.codigo, o.valor)}
                    disabled={bloqueado}
                    aria-pressed={activo}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                      activo
                        ? "border-grana bg-grana/10 text-grana"
                        : bloqueado
                          ? "border-linea text-ceniza/50 line-through"
                          : "border-linea text-tinta hover:border-ceniza/50 hover:bg-arena/50"
                    }`}
                  >
                    {o.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="min-h-5" aria-live="polite">
        {completo ? (
          <p className={`text-sm ${!agotado && disponible <= 3 ? "text-grana" : "text-ceniza"}`}>
            {disponible > 0
              ? disponible <= 3
                ? `Solo quedan ${disponible}.`
                : `${disponible} disponibles.`
              : "Agotado en esta combinación — prueba otra."}
          </p>
        ) : (
          <p className="text-sm text-ceniza">
            Elige {faltan.join(" y ")} para agregar al carrito.
          </p>
        )}
      </div>

      {variante && !agotado ? (
        <SelectorCantidad value={qty} onChange={setQty} max={disponible} />
      ) : null}

      <AddToCart
        product={product}
        variante={
          variante
            ? { id: variante.id, opciones: variante.opciones, precio: variante.precio }
            : undefined
        }
        qty={qty}
        disabled={!variante || agotado}
        disabledLabel={
          faltan.length
            ? `Elige ${faltan.join(" y ")}`
            : agotado
              ? "Agotado"
              : undefined
        }
      />
    </div>
  );
}
