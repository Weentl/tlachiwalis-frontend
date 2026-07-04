"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AtributoDeCategoria, AtributoOpcion } from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// MATRIZ DE VARIANTES (Paso 3 "Sí, tengo opciones" y pestaña "Opciones" de EDITAR).
// ════════════════════════════════════════════════════════════════════════════
// El artesano elige QUÉ opciones ofrece por cada eje (talla/color…). Con eso se
// arma el producto cartesiano de combinaciones y una fila de stock por combo.
//   1 eje  → lista de opciones con su stock.
//   2 ejes → matriz (una fila por combinación).
// Límite 100 combos (trigger 0009 C.2 es la autoridad; aquí solo avisamos).
// El cliente NUNCA manda sku/precio_delta: solo {opciones, stock}. Se serializa a
// un hidden <input name="variantes"> (contrato de variantesFormSchema).

const MAX_COMBOS = 100;

type FilaStock = { opciones: Record<string, string>; stock: number };

function clave(op: Record<string, string>): string {
  return Object.keys(op)
    .sort()
    .map((k) => `${k}=${op[k]}`)
    .join("|");
}

// Producto cartesiano de las opciones SELECCIONADAS por eje.
function cartesiano(
  ejes: AtributoDeCategoria[],
  seleccion: Record<string, Set<string>>,
): Array<Record<string, string>> {
  let filas: Array<Record<string, string>> = [{}];
  for (const eje of ejes) {
    const elegidas = eje.opciones.filter((o) => seleccion[eje.codigo]?.has(o.valor));
    if (elegidas.length === 0) continue;
    const siguiente: Array<Record<string, string>> = [];
    for (const base of filas) {
      for (const op of elegidas) {
        siguiente.push({ ...base, [eje.codigo]: op.valor });
      }
    }
    filas = siguiente;
  }
  // Si no se eligió nada en ningún eje, no hay combinaciones.
  return filas.length === 1 && Object.keys(filas[0]).length === 0 ? [] : filas;
}

function etiquetaDe(op: AtributoOpcion): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5">
      {op.hex ? (
        <span
          className="h-3.5 w-3.5 rounded-full border border-black/10"
          style={{ background: op.hex }}
          aria-hidden
        />
      ) : null}
      {op.etiqueta}
    </span>
  );
}

export function MatrizVariantes({
  name = "variantes",
  ejes,
  inicial,
  error,
}: {
  name?: string;
  ejes: AtributoDeCategoria[];
  inicial?: FilaStock[];
  error?: string;
}) {
  // Selección inicial de opciones por eje, derivada de las filas existentes (EDITAR).
  const [seleccion, setSeleccion] = React.useState<Record<string, Set<string>>>(
    () => {
      const base: Record<string, Set<string>> = {};
      for (const eje of ejes) base[eje.codigo] = new Set();
      for (const fila of inicial ?? []) {
        for (const [codigo, valor] of Object.entries(fila.opciones)) {
          if (base[codigo]) base[codigo].add(valor);
        }
      }
      return base;
    },
  );

  // Stock por clave de combinación (se preserva al alternar opciones).
  const [stockPorClave, setStockPorClave] = React.useState<Record<string, number>>(
    () => {
      const base: Record<string, number> = {};
      for (const fila of inicial ?? []) base[clave(fila.opciones)] = fila.stock;
      return base;
    },
  );

  const toggleOpcion = (codigo: string, valor: string) => {
    setSeleccion((prev) => {
      const set = new Set(prev[codigo] ?? []);
      if (set.has(valor)) set.delete(valor);
      else set.add(valor);
      return { ...prev, [codigo]: set };
    });
  };

  const combos = React.useMemo(
    () => cartesiano(ejes, seleccion),
    [ejes, seleccion],
  );

  const filas: FilaStock[] = combos.map((op) => ({
    opciones: op,
    stock: stockPorClave[clave(op)] ?? 0,
  }));

  const json = JSON.stringify(filas);
  const excede = filas.length > MAX_COMBOS;

  return (
    <div className="space-y-5">
      <input type="hidden" name={name} value={excede ? "[]" : json} />
      {error ? (
        <p className="rounded-ob-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* Selección de opciones por eje */}
      {ejes.map((eje) => (
        <div key={eje.id}>
          <Label className="mb-1.5 block">{eje.nombre}</Label>
          <div className="flex flex-wrap gap-2">
            {eje.opciones.map((op) => {
              const activa = seleccion[eje.codigo]?.has(op.valor) ?? false;
              return (
                <button
                  key={op.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => toggleOpcion(eje.codigo, op.valor)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-ob-sm border px-3 py-2 text-sm transition-colors",
                    activa
                      ? "border-tinto bg-tinto/10 text-tinto"
                      : "border-tinto/20 text-foreground hover:border-tinto/50 hover:bg-tinto/5",
                  )}
                >
                  {etiquetaDe(op)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Tabla de combinaciones + stock */}
      {filas.length === 0 ? (
        <p className="rounded-ob-sm border border-tinto/15 bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          Elige al menos una opción arriba para armar tus combinaciones.
        </p>
      ) : excede ? (
        <p className="rounded-ob-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Son {filas.length} combinaciones y el máximo es {MAX_COMBOS}. Quita
          algunas opciones.
        </p>
      ) : (
        <div className="overflow-hidden rounded-ob-sm border border-tinto/15">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tinto/12 bg-tinto/[0.03] text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Combinación</th>
                <th className="w-32 px-4 py-2.5 font-medium">¿Cuántas?</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const k = clave(fila.opciones);
                const desc = ejes
                  .filter((e) => fila.opciones[e.codigo])
                  .map((e) => {
                    const op = e.opciones.find(
                      (o) => o.valor === fila.opciones[e.codigo],
                    );
                    return op?.etiqueta ?? fila.opciones[e.codigo];
                  })
                  .join(" · ");
                return (
                  <tr key={k} className="border-t border-tinto/10">
                    <td className="px-4 py-2.5 text-foreground">{desc}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={String(fila.stock)}
                        onChange={(e) => {
                          const num = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          setStockPorClave((prev) => ({ ...prev, [k]: num }));
                        }}
                        className="text-center"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
