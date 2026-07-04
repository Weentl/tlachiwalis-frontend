import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Convierte un nombre en un slug web-safe (minúsculas, sin acentos, guiones).
// El artesano NUNCA teclea esto: se genera del nombre en el servidor.
export function slugify(s: string): string {
  const base = (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "pieza";
}

/**
 * Genera un slug ÚNICO para (tabla, columna) a partir del nombre. Si el base ya
 * existe, agrega sufijo -2, -3… (y de último recurso un sufijo temporal). El
 * respaldo real de unicidad es el constraint UNIQUE/PK en la BD.
 */
export async function slugUnico(
  supabase: SupabaseClient,
  tabla: string,
  columna: string,
  nombre: string,
): Promise<string> {
  const base = slugify(nombre);
  const { data } = await supabase
    .from(tabla)
    .select(columna)
    .ilike(columna, `${base}%`);
  // Columna dinámica → Supabase no resuelve el tipo; casteamos vía unknown.
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const usados = new Set(rows.map((r) => r[columna] as string));
  if (!usados.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    if (!usados.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
