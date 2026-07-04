"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AtributoDeCategoria } from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// CAMPOS DINÁMICOS (Paso 2 del wizard y pestaña "Detalles" de EDITAR).
// ════════════════════════════════════════════════════════════════════════════
// Renderiza los atributos DESCRIPTIVOS (es_variacion=false) de una categoría,
// uno por tipo:
//   lista    → botones-etiqueta (swatch de color si la opción trae hex).
//   numero   → input numérico con sufijo de unidad (cm, g…).
//   booleano → toggle sí/no.
//   texto    → input de texto.
// El valor vive en estado controlado y se serializa a UN hidden <input name>
// como JSON (contrato de atributosFormSchema: el servidor NUNCA confía en la
// forma, revalida con atributosSchema + el trigger 0009 C.1 es la autoridad).
//
// Los REQUERIDOS no bloquean aquí (se exigen al Publicar); solo se marcan con un
// asterisco suave para orientar. Copy humano, cero jerga.

export type ValorAtributo = string | number | boolean;

function normalizaValor(
  def: AtributoDeCategoria,
  raw: ValorAtributo | undefined,
): ValorAtributo | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (def.tipo === "numero") {
    const nUm = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(nUm) ? nUm : undefined;
  }
  if (def.tipo === "booleano") return raw === true || raw === "true";
  return String(raw);
}

export function CamposDinamicos({
  name = "atributos",
  descriptivos,
  inicial,
  errors,
}: {
  name?: string;
  descriptivos: AtributoDeCategoria[];
  inicial?: Record<string, ValorAtributo>;
  errors?: Record<string, string | undefined>;
}) {
  const [valores, setValores] = React.useState<Record<string, ValorAtributo>>(
    () => {
      const base: Record<string, ValorAtributo> = {};
      for (const d of descriptivos) {
        const v = normalizaValor(d, inicial?.[d.codigo]);
        if (v !== undefined) base[d.codigo] = v;
      }
      return base;
    },
  );

  const set = React.useCallback(
    (codigo: string, valor: ValorAtributo | undefined) => {
      setValores((prev) => {
        const next = { ...prev };
        if (valor === undefined || valor === "") delete next[codigo];
        else next[codigo] = valor;
        return next;
      });
    },
    [],
  );

  const json = JSON.stringify(valores);

  if (descriptivos.length === 0) {
    return (
      <>
        <input type="hidden" name={name} value={json} />
        <p className="text-sm text-muted-foreground">
          Esta categoría no pide detalles extra. Puedes seguir.
        </p>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name={name} value={json} />
      {descriptivos.map((def) => (
        <CampoUno
          key={def.id}
          def={def}
          valor={valores[def.codigo]}
          onChange={(v) => set(def.codigo, v)}
          error={errors?.[def.codigo]}
        />
      ))}
    </div>
  );
}

function CampoUno({
  def,
  valor,
  onChange,
  error,
}: {
  def: AtributoDeCategoria;
  valor: ValorAtributo | undefined;
  onChange: (v: ValorAtributo | undefined) => void;
  error?: string;
}) {
  const etiqueta = (
    <Label className="mb-1.5 block">
      {def.nombre}
      {def.requerido ? (
        <span className="ml-1 text-tinto/60" title="Necesario para publicar">
          *
        </span>
      ) : null}
    </Label>
  );

  return (
    <div>
      {etiqueta}
      {def.tipo === "lista" ? (
        <ListaOpciones def={def} valor={valor as string} onChange={onChange} />
      ) : def.tipo === "numero" ? (
        <NumeroConUnidad def={def} valor={valor as number} onChange={onChange} />
      ) : def.tipo === "booleano" ? (
        <Toggle valor={valor === true} onChange={onChange} />
      ) : (
        <Input
          defaultValue={typeof valor === "string" ? valor : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="Escribe aquí…"
        />
      )}
      {def.ayuda_texto ? (
        <p className="mt-1 text-xs text-muted-foreground">{def.ayuda_texto}</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── lista → botones-etiqueta (swatch de color si trae hex) ────────────────────
function ListaOpciones({
  def,
  valor,
  onChange,
}: {
  def: AtributoDeCategoria;
  valor: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {def.opciones.map((op) => {
        const activa = valor === op.valor;
        return (
          <button
            key={op.id}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange(activa ? undefined : op.valor)}
            className={cn(
              "inline-flex items-center gap-2 rounded-ob-sm border px-3 py-2 text-sm transition-colors",
              activa
                ? "border-tinto bg-tinto/10 text-tinto"
                : "border-tinto/20 text-foreground hover:border-tinto/50 hover:bg-tinto/5",
            )}
          >
            {op.hex ? (
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                style={{ background: op.hex }}
                aria-hidden
              />
            ) : null}
            {op.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

// ── numero → input con sufijo de unidad ───────────────────────────────────────
function NumeroConUnidad({
  def,
  valor,
  onChange,
}: {
  def: AtributoDeCategoria;
  valor: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        defaultValue={typeof valor === "number" ? String(valor) : ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(undefined);
          const num = Number(raw);
          onChange(Number.isFinite(num) ? num : undefined);
        }}
        className={def.unidad ? "pr-12" : undefined}
        placeholder="0"
      />
      {def.unidad ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {def.unidad}
        </span>
      ) : null}
    </div>
  );
}

// ── booleano → toggle sí/no ───────────────────────────────────────────────────
function Toggle({
  valor,
  onChange,
}: {
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-ob-sm border border-tinto/20">
      {[
        { v: false, label: "No" },
        { v: true, label: "Sí" },
      ].map((o) => (
        <button
          key={String(o.v)}
          type="button"
          aria-pressed={valor === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "px-4 py-2 text-sm transition-colors",
            valor === o.v
              ? "bg-tinto text-[#f7f1e6]"
              : "text-foreground hover:bg-tinto/5",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
