"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PiezaCard } from "@/components/pieza-card";
import { PiezaRail } from "@/components/pieza-rail";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";
import { formatMXN, type CardProducto } from "@/lib/products";
import { tendencia, novedades, porOficio, recomendados } from "@/lib/escaparate";

type Sort = "recomendado" | "novedades" | "precio-asc" | "precio-desc";
const SORTS: { v: Sort; label: string }[] = [
  { v: "recomendado", label: "Recomendados" },
  { v: "novedades", label: "Novedades" },
  { v: "precio-asc", label: "Precio: menor a mayor" },
  { v: "precio-desc", label: "Precio: mayor a menor" },
];
const PRECIOS = [
  { v: "", label: "Cualquier precio" },
  { v: "0-1000", label: "Menos de $1,000" },
  { v: "1000-2000", label: "$1,000 – $2,000" },
  { v: "2000-3500", label: "$2,000 – $3,500" },
  { v: "3500-", label: "Más de $3,500" },
];
const TIPOS = [
  { v: "", label: "Todos los tipos", hint: "" },
  { v: "unico", label: "Pieza única", hint: "Solo existe un ejemplar" },
  { v: "stock_simple", label: "En stock", hint: "Varias disponibles" },
  { v: "con_variantes", label: "Con variantes", hint: "Elige talla o color" },
];

function enRango(precio: number, rango: string): boolean {
  if (!rango) return true;
  const [min, max] = rango.split("-");
  if (precio < Number(min)) return false;
  if (max && precio > Number(max)) return false;
  return true;
}

export function Catalog({
  products,
  oficios,
  regiones,
  initialOficio = "Todos",
  initialQ = "",
  initialTipo = "",
  initialRegion = "",
}: {
  products: CardProducto[];
  oficios: string[];
  regiones: string[];
  initialOficio?: string;
  initialQ?: string;
  initialTipo?: string;
  initialRegion?: string;
}) {
  const [oficio, setOficio] = useState(initialOficio);
  const [region, setRegion] = useState(initialRegion);
  const [tipo, setTipo] = useState(initialTipo);
  const [precio, setPrecio] = useState("");
  const [sort, setSort] = useState<Sort>("recomendado");
  const [q, setQ] = useState(initialQ);
  const [verAgotadas, setVerAgotadas] = useState(false);
  const [sheet, setSheet] = useState(false);

  const cats = ["Todos", ...oficios];
  const hayFiltros =
    oficio !== "Todos" || !!region || !!tipo || !!precio || !!q.trim() || sort !== "recomendado";

  const sincronizarUrl = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const nextOficio = patch.oficio ?? oficio;
    const nextRegion = patch.region ?? region;
    const nextTipo = patch.tipo ?? tipo;
    const nextQ = patch.buscar ?? q;
    if (nextOficio && nextOficio !== "Todos") p.set("oficio", nextOficio);
    if (nextRegion) p.set("region", nextRegion);
    if (nextTipo) p.set("tipo", nextTipo);
    if (nextQ.trim()) p.set("buscar", nextQ.trim());
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `/tienda?${qs}` : "/tienda");
  };

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    let r = products.filter((p) => {
      if (oficio !== "Todos" && p.oficio !== oficio) return false;
      if (region && p.region !== region) return false;
      if (tipo && p.tipo !== tipo) return false;
      if (!enRango(p.precio, precio)) return false;
      if (term && ![p.nombre, p.maker, p.oficio, p.region].some((x) => x?.toLowerCase().includes(term)))
        return false;
      return true;
    });
    if (!verAgotadas) r = r.filter((p) => p.disponibleTotal > 0);

    if (sort === "precio-asc") r = [...r].sort((a, b) => a.precio - b.precio);
    else if (sort === "precio-desc") r = [...r].sort((a, b) => b.precio - a.precio);
    else if (sort === "novedades")
      r = [...r].sort((a, b) => (a.publicadoEn < b.publicadoEn ? 1 : a.publicadoEn > b.publicadoEn ? -1 : 0));
    else r = recomendados(r);
    // agotadas al final si se muestran
    r = [...r].sort((a, b) => Number(a.disponibleTotal <= 0) - Number(b.disponibleTotal <= 0));
    return r;
  }, [products, oficio, region, tipo, precio, q, sort, verAgotadas]);

  const precios = filtradas.map((p) => p.precio);
  const rango = precios.length ? { min: Math.min(...precios), max: Math.max(...precios) } : null;

  const limpiar = () => {
    setOficio("Todos");
    setRegion("");
    setTipo("");
    setPrecio("");
    setQ("");
    setSort("recomendado");
    window.history.replaceState(null, "", "/tienda");
  };

  const chip = (c: string) => (
    <button
      key={c}
      type="button"
      onClick={() => {
        setOficio(c);
        sincronizarUrl({ oficio: c });
      }}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
        oficio === c ? "bg-tinta text-cal" : "border border-linea text-tinta hover:border-ceniza/45 hover:bg-arena/50",
      )}
    >
      {c}
    </button>
  );

  // Chips de filtros activos (removibles).
  const activos: { label: string; clear: () => void }[] = [];
  if (region) activos.push({ label: region, clear: () => { setRegion(""); sincronizarUrl({ region: "" }); } });
  if (tipo) activos.push({ label: TIPOS.find((t) => t.v === tipo)?.label ?? tipo, clear: () => { setTipo(""); sincronizarUrl({ tipo: "" }); } });
  if (precio) activos.push({ label: PRECIOS.find((p) => p.v === precio)?.label ?? precio, clear: () => setPrecio("") });
  if (q.trim()) activos.push({ label: `"${q.trim()}"`, clear: () => { setQ(""); sincronizarUrl({ buscar: "" }); } });

  return (
    <div>
      {/* Barra sticky */}
      <div className="sticky top-16 z-30 -mx-5 border-b border-linea bg-cal/85 px-5 py-3 backdrop-blur md:top-20 md:-mx-6 md:px-6">
        <div className="flex items-center gap-3">
          <div className="no-scrollbar hidden gap-2 overflow-x-auto md:flex md:flex-wrap">{cats.map(chip)}</div>
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="flex items-center gap-2 rounded-full border border-linea px-4 py-2 text-sm text-tinta md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filtros
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ceniza"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => sincronizarUrl({})}
                placeholder="Buscar…"
                aria-label="Buscar piezas"
                className="h-10 w-36 rounded-full border border-linea bg-lino pl-9 pr-3 text-sm text-tinta placeholder:text-ceniza focus:border-grana focus:outline-none lg:w-48"
              />
            </div>
            <button
              type="button"
              onClick={() => setSheet(true)}
              className="hidden items-center gap-2 rounded-full border border-linea px-4 text-sm text-tinta h-10 md:flex"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
              Filtros
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Ordenar"
              className="h-10 rounded-full border border-linea bg-lino px-3 text-sm text-tinta focus:border-grana focus:outline-none"
            >
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Chips activos */}
        {activos.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activos.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={a.clear}
                className="inline-flex items-center gap-1.5 rounded-full bg-arena px-3 py-1 text-xs text-tinta transition-colors hover:bg-arena/70"
              >
                {a.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            ))}
            <button type="button" onClick={limpiar} className="text-xs text-grana underline underline-offset-4 hover:decoration-grana">
              Limpiar todo
            </button>
          </div>
        ) : null}
      </div>

      {hayFiltros ? (
        /* -------- Modo resultados -------- */
        <>
          <p className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ceniza">
            {filtradas.length} {filtradas.length === 1 ? "pieza" : "piezas"}
            {oficio !== "Todos" ? ` · ${oficio}` : ""}
            {rango ? ` · de ${formatMXN(rango.min)} a ${formatMXN(rango.max)}` : ""}
          </p>
          {filtradas.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
              {filtradas.map((p, i) => (
                <PiezaCard key={p.id} id={p.id} nombre={p.nombre} maker={p.maker} region={p.region} precio={p.precio} precioDesde={p.precioDesde} esDesde={p.esDesde} img={p.img} disponibleTotal={p.disponibleTotal} tipo={p.tipo} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-lg text-ceniza">No encontramos piezas con esos filtros.</p>
              <button type="button" onClick={limpiar} className="mt-3 text-base text-grana underline decoration-grana/40 underline-offset-4 hover:decoration-grana">
                Limpiar filtros →
              </button>
              <div className="mt-10 text-left">
                <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ceniza">Mientras tanto, quizá te guste</p>
                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
                  {recomendados(products.filter((p) => p.disponibleTotal > 0)).slice(0, 4).map((p) => (
                    <PiezaCard key={p.id} id={p.id} nombre={p.nombre} maker={p.maker} region={p.region} precio={p.precio} precioDesde={p.precioDesde} esDesde={p.esDesde} img={p.img} disponibleTotal={p.disponibleTotal} tipo={p.tipo} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* -------- Modo escaparate -------- */
        <div className="-mx-5 md:-mx-6">
          <PiezaRail eyebrow="Lo que más se está viendo" titulo="En tendencia" productos={tendencia(products, 8)} />
          <PiezaRail eyebrow="Novedades" titulo="Recién del taller" productos={novedades(products, 6)} />
          {oficios.map((of) => {
            const ps = porOficio(products, of, 6);
            if (ps.length === 0) return null;
            return (
              <PiezaRail key={of} titulo={of} verTodoHref={`/tienda?oficio=${encodeURIComponent(of)}`} verTodoLabel={`Ver todo →`} productos={ps} />
            );
          })}
          <section className="mx-auto w-full max-w-7xl px-5 pt-8 md:px-6">
            <h2 className="font-display text-2xl text-tinta sm:text-3xl">Todo el catálogo</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
              {/* Todas las piezas; las vendidas/agotadas al final (se muestran como "Vendida"). */}
              {[...products]
                .sort((a, b) => Number(a.disponibleTotal <= 0) - Number(b.disponibleTotal <= 0))
                .map((p) => (
                  <PiezaCard key={p.id} id={p.id} nombre={p.nombre} maker={p.maker} region={p.region} precio={p.precio} precioDesde={p.precioDesde} esDesde={p.esDesde} img={p.img} disponibleTotal={p.disponibleTotal} tipo={p.tipo} />
                ))}
            </div>
          </section>
        </div>
      )}

      {/* Bottom sheet / panel de filtros */}
      <div aria-hidden={!sheet} className={cn("fixed inset-0 z-[60]", sheet ? "" : "pointer-events-none")}>
        <button type="button" aria-label="Cerrar filtros" onClick={() => setSheet(false)} className={cn("absolute inset-0 bg-tinta/40 backdrop-blur-sm transition-opacity duration-300", sheet ? "opacity-100" : "opacity-0")} />
        <div role="dialog" aria-label="Filtros" className={cn("absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[24px] bg-cal px-6 pb-8 pt-5 shadow-alto transition-transform duration-300 ease-out sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[24rem] sm:max-h-none sm:rounded-none sm:rounded-l-[24px]", sheet ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full")}>
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-linea sm:hidden" />

          <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Oficio</p>
          <div className="mt-3 flex flex-wrap gap-2">{cats.map(chip)}</div>

          <p className="mt-6 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Región</p>
          <select value={region} onChange={(e) => { setRegion(e.target.value); sincronizarUrl({ region: e.target.value }); }} className="mt-3 w-full rounded-[12px] border border-linea bg-lino px-3.5 py-2.5 text-sm text-tinta focus:border-grana focus:outline-none">
            <option value="">Todas las regiones</option>
            {regiones.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <p className="mt-6 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Tipo de pieza</p>
          <div className="mt-3 space-y-1">
            {TIPOS.map((t) => (
              <button key={t.v} type="button" onClick={() => { setTipo(t.v); sincronizarUrl({ tipo: t.v }); }} className={cn("flex w-full flex-col rounded-[12px] px-4 py-2.5 text-left transition-colors", tipo === t.v ? "bg-arena" : "hover:bg-arena/50")}>
                <span className="text-sm text-tinta">{t.label}</span>
                {t.hint ? <span className="text-xs text-ceniza">{t.hint}</span> : null}
              </button>
            ))}
          </div>

          <p className="mt-6 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Precio</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRECIOS.map((p) => (
              <button key={p.v} type="button" onClick={() => setPrecio(p.v)} className={cn("rounded-full px-3.5 py-1.5 text-sm transition-colors", precio === p.v ? "bg-tinta text-cal" : "border border-linea text-tinta hover:bg-arena/50")}>
                {p.label}
              </button>
            ))}
          </div>

          <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm text-tinta">
            <input type="checkbox" checked={verAgotadas} onChange={(e) => setVerAgotadas(e.target.checked)} className="h-4 w-4 accent-grana" />
            Mostrar piezas agotadas
          </label>

          <div className="mt-7 flex items-center gap-3">
            <button type="button" onClick={() => setSheet(false)} className={cn(botonCls({ variant: "primary", size: "lg", pill: true }), "flex-1")}>
              Ver {filtradas.length} {filtradas.length === 1 ? "pieza" : "piezas"}
            </button>
            <button type="button" onClick={limpiar} className="text-sm text-ceniza hover:text-tinta">Limpiar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
