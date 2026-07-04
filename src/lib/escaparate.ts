import type { CardProducto } from "@/lib/products";

// Lógica del "escaparate": a partir de TODAS las piezas (getPiezas) reparte en memoria los
// carriles del marketplace. Puro (sin DB) → reutilizable en landing y tienda.

const disponibles = (ps: CardProducto[]) => ps.filter((p) => p.disponibleTotal > 0);

export function tendencia(ps: CardProducto[], n = 8): CardProducto[] {
  const t = disponibles(ps).filter((p) => p.tendencia);
  return (t.length ? t : recomendados(disponibles(ps))).slice(0, n);
}

export function novedades(ps: CardProducto[], n = 6): CardProducto[] {
  return [...disponibles(ps)]
    .sort((a, b) => (a.publicadoEn < b.publicadoEn ? 1 : a.publicadoEn > b.publicadoEn ? -1 : 0))
    .slice(0, n);
}

export function unicas(ps: CardProducto[], n = 4): CardProducto[] {
  return disponibles(ps)
    .filter((p) => p.tipo === "unico")
    .slice(0, n);
}

export function porOficio(ps: CardProducto[], oficio: string, n = 4): CardProducto[] {
  return disponibles(ps)
    .filter((p) => p.oficio === oficio)
    .slice(0, n);
}

// "Recomendados": disponibles → destacadas → tendencia → resto (orden estable).
export function recomendados(ps: CardProducto[]): CardProducto[] {
  const score = (p: CardProducto) =>
    (p.disponibleTotal > 0 ? 0 : 1000) + (p.destacado ? 0 : 100) + (p.tendencia ? 0 : 10);
  return ps
    .map((p, i) => ({ p, i }))
    .sort((a, b) => score(a.p) - score(b.p) || a.i - b.i)
    .map((x) => x.p);
}

export type Conteo = { nombre: string; num: number };

export function regionesConteo(ps: CardProducto[]): Conteo[] {
  const m = new Map<string, number>();
  for (const p of ps) if (p.region) m.set(p.region, (m.get(p.region) ?? 0) + 1);
  return [...m.entries()]
    .map(([nombre, num]) => ({ nombre, num }))
    .sort((a, b) => b.num - a.num);
}

export type OficioVitrina = { nombre: string; num: number; img: string; region: string };

// Oficios con conteo + imagen y región representativas (para los bloques "Explorar por oficio").
export function oficiosVitrina(ps: CardProducto[]): OficioVitrina[] {
  const m = new Map<string, { num: number; img: string; region: string }>();
  for (const p of ps) {
    const cur = m.get(p.oficio);
    if (!cur) m.set(p.oficio, { num: 1, img: p.img, region: p.region });
    else {
      cur.num++;
      if (!cur.img && p.img) cur.img = p.img;
    }
  }
  return [...m.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.num - a.num);
}
