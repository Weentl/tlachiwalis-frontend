import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Atributo,
  AtributoDeCategoria,
  AtributoOpcion,
  Categoria,
  CategoriaAtributo,
} from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// NÚCLEO PURO de lecturas de taxonomía (0007), con el cliente Supabase INYECTADO.
// ════════════════════════════════════════════════════════════════════════════
// El catálogo NO es sensible (RLS lectura pública, 0007), pero estas lecturas se
// ejecutan bajo la SESIÓN del llamante (admin o vendedor). Por eso el cliente se
// inyecta: lib/admin/taxonomia.ts lo llama con la sesión de requireAdmin() y
// lib/vendedor/taxonomia.ts con la de requireVendedor(). Así el "formulario
// dinámico" del wizard es idéntico en ambos paneles SIN duplicar la lógica de
// resolución (categoria_atributos + atributos + atributo_opciones ordenados).
//
// PROPAGA errores (no degrada a estático): un catálogo a medias produciría un
// wizard silenciosamente incompleto (atributos requeridos faltantes), peor que un
// error visible. Los consumidores lo capturan en el boundary de la page.

const CATEGORIA_COLS =
  "id,slug,nombre,parent_id,clave_prod_serv,clave_unidad,objeto_impuesto,orden,activa,created_at";
const ATRIBUTO_COLS = "id,codigo,nombre,tipo,unidad,filtrable,ayuda_texto";
const OPCION_COLS = "id,atributo_id,valor,etiqueta,hex,orden";
const CAT_ATR_COLS = "categoria_id,atributo_id,es_variacion,requerido,orden";

/** Categorías ACTIVAS ordenadas (grid de tarjetas del Paso 1). */
export async function leerCategorias(
  supabase: SupabaseClient,
): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("categorias")
    .select(CATEGORIA_COLS)
    .eq("activa", true)
    .order("orden", { ascending: true });
  if (error) throw new Error(`No se pudieron leer categorías: ${error.message}`);
  return (data ?? []) as Categoria[];
}

/** Todos los atributos del catálogo (resolver por id sin re-consultar). */
export async function leerAtributos(
  supabase: SupabaseClient,
): Promise<Atributo[]> {
  const { data, error } = await supabase
    .from("atributos")
    .select(ATRIBUTO_COLS)
    .order("codigo", { ascending: true });
  if (error) throw new Error(`No se pudieron leer atributos: ${error.message}`);
  return (data ?? []) as Atributo[];
}

/**
 * Resuelve el "formulario dinámico" de una categoría: junta categoria_atributos
 * con su atributo y (para los de tipo 'lista') sus opciones. Devuelve la lista ya
 * ordenada por `orden`. El consumidor separa por `es_variacion`:
 *  - es_variacion=false → van en productos.atributos (descriptivos, Paso 2).
 *  - es_variacion=true  → van en producto_variantes.opciones (ejes, Paso 3).
 */
export async function leerAtributosDeCategoria(
  supabase: SupabaseClient,
  categoriaId: number,
): Promise<AtributoDeCategoria[]> {
  const { data: rel, error: relErr } = await supabase
    .from("categoria_atributos")
    .select(CAT_ATR_COLS)
    .eq("categoria_id", categoriaId)
    .order("orden", { ascending: true });
  if (relErr)
    throw new Error(
      `No se pudieron leer atributos de categoría: ${relErr.message}`,
    );

  const relaciones = (rel ?? []) as CategoriaAtributo[];
  if (relaciones.length === 0) return [];

  const atributoIds = relaciones.map((r) => r.atributo_id);

  const [{ data: atrs, error: atrErr }, { data: ops, error: opErr }] =
    await Promise.all([
      supabase.from("atributos").select(ATRIBUTO_COLS).in("id", atributoIds),
      supabase
        .from("atributo_opciones")
        .select(OPCION_COLS)
        .in("atributo_id", atributoIds),
    ]);
  if (atrErr) throw new Error(`No se pudieron leer atributos: ${atrErr.message}`);
  if (opErr) throw new Error(`No se pudieron leer opciones: ${opErr.message}`);

  const atrPorId = new Map<number, Atributo>(
    ((atrs ?? []) as Atributo[]).map((a) => [a.id, a]),
  );
  const opcionesPorAtributo = new Map<number, AtributoOpcion[]>();
  for (const op of (ops ?? []) as AtributoOpcion[]) {
    const arr = opcionesPorAtributo.get(op.atributo_id) ?? [];
    arr.push(op);
    opcionesPorAtributo.set(op.atributo_id, arr);
  }
  for (const arr of opcionesPorAtributo.values()) {
    arr.sort((a, b) => a.orden - b.orden);
  }

  return relaciones
    .map((r) => {
      const atr = atrPorId.get(r.atributo_id);
      if (!atr) return null;
      return {
        ...atr,
        es_variacion: r.es_variacion,
        requerido: r.requerido,
        orden: r.orden,
        opciones: opcionesPorAtributo.get(r.atributo_id) ?? [],
      } satisfies AtributoDeCategoria;
    })
    .filter((x): x is AtributoDeCategoria => x !== null);
}

// ── Conversión núcleo → contrato de zod (AtributoDef de schemas.ts) ──
// El builder atributosSchema()/opcionesSchema() consume `AtributoDef`; el wizard
// resuelve AtributoDeCategoria y necesita mapearlo. Aquí, junto al núcleo, para
// que admin y vendedor produzcan defs IDÉNTICAS.
import type { AtributoDef } from "@/lib/admin/schemas";

export function aDef(a: AtributoDeCategoria): AtributoDef {
  return {
    codigo: a.codigo,
    tipo: a.tipo,
    requerido: a.requerido,
    opciones:
      a.tipo === "lista" ? a.opciones.map((o) => o.valor) : undefined,
  };
}

/** Solo los atributos DESCRIPTIVOS (Paso 2 → productos.atributos jsonb). */
export function descriptivos(
  defs: readonly AtributoDeCategoria[],
): AtributoDeCategoria[] {
  return defs.filter((d) => !d.es_variacion);
}

/**
 * Resuelve el formulario dinámico de TODAS las categorías activas de una sola vez.
 * El wizard (cliente) lo necesita PRE-RESUELTO para no hacer round-trips al servidor
 * cuando el artesano cambia de categoría en el Paso 1. Devuelve un mapa
 * categoria_id → AtributoDeCategoria[] (descriptivos + ejes, sin separar). Cliente
 * inyectado igual que el resto del núcleo (admin/vendedor comparten esta lógica).
 */
export async function leerMapaAtributosPorCategoria(
  supabase: SupabaseClient,
  categorias: readonly Categoria[],
): Promise<Record<number, AtributoDeCategoria[]>> {
  const pares = await Promise.all(
    categorias.map(
      async (c) =>
        [c.id, await leerAtributosDeCategoria(supabase, c.id)] as const,
    ),
  );
  return Object.fromEntries(pares);
}

/** Solo los EJES de variación (Paso 3 → producto_variantes.opciones). */
export function ejes(
  defs: readonly AtributoDeCategoria[],
): AtributoDeCategoria[] {
  return defs.filter((d) => d.es_variacion);
}
