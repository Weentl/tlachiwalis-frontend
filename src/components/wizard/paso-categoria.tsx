"use client";
import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// PASO 1 — ¿QUÉ VAS A VENDER? Grid de tarjetas de CATEGORÍA con buscador.
// ════════════════════════════════════════════════════════════════════════════
// NO es un <select>: tarjetas grandes, tap-friendly (móvil-primero). El buscador
// filtra por nombre (sin acentos). La elección decide los atributos del Paso 2 y
// si el Paso 3 ofrece variantes. Guarda categoria_id (number) en el estado del
// wizard; el <select> real es un hidden que el wizard maneja.

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PasoCategoria({
  categorias,
  seleccionada,
  onSelect,
}: {
  categorias: Categoria[];
  seleccionada: number | null;
  onSelect: (id: number) => void;
}) {
  const [q, setQ] = React.useState("");
  const filtradas = React.useMemo(() => {
    const needle = sinAcentos(q.trim());
    if (!needle) return categorias;
    return categorias.filter((c) => sinAcentos(c.nombre).includes(needle));
  }, [categorias, q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca tu tipo de pieza…"
          className="pl-9"
          aria-label="Buscar categoría"
        />
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-ob-sm border border-tinto/15 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          No encontramos ese tipo. Prueba con otra palabra.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtradas.map((c) => {
            const activa = seleccionada === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={activa}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "flex min-h-[92px] flex-col items-start justify-end rounded-ob-sm border p-4 text-left transition-colors",
                  activa
                    ? "border-tinto bg-tinto/10 ring-1 ring-tinto"
                    : "border-tinto/20 bg-background hover:border-tinto/50 hover:bg-tinto/5",
                )}
              >
                <span
                  className={cn(
                    "font-grotesk text-base font-semibold leading-tight",
                    activa ? "text-tinto" : "text-foreground",
                  )}
                >
                  {c.nombre}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
