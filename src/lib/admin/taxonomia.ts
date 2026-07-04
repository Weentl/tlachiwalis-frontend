import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import {
  leerAtributos,
  leerAtributosDeCategoria,
  leerCategorias,
  leerMapaAtributosPorCategoria,
} from "@/lib/taxonomia-core";
import type { Atributo, AtributoDeCategoria, Categoria } from "@/lib/admin/types";

// Taxonomía (0007) BAJO la sesión del admin. La lógica de resolución vive en
// lib/taxonomia-core.ts (cliente inyectado) para compartirla con el vendedor
// sin duplicarla; aquí solo se ata la sesión de requireAdmin(). API pública
// SIN cambios respecto a la versión previa (retrocompatible).

/** Lista las categorías activas, ordenadas para los selects/tarjetas del panel. */
export async function listarCategorias(): Promise<Categoria[]> {
  const { supabase } = await requireAdmin();
  return leerCategorias(supabase);
}

/** Todos los atributos del catálogo (útil para resolver por id sin re-consultar). */
export async function listarAtributos(): Promise<Atributo[]> {
  const { supabase } = await requireAdmin();
  return leerAtributos(supabase);
}

/**
 * Resuelve el "formulario dinámico" de una categoría (categoria_atributos +
 * atributos + opciones), ordenado. Separa por `es_variacion` en el consumidor.
 */
export async function atributosDeCategoria(
  categoriaId: number,
): Promise<AtributoDeCategoria[]> {
  const { supabase } = await requireAdmin();
  return leerAtributosDeCategoria(supabase, categoriaId);
}

/**
 * Categorías + su mapa de atributos PRE-RESUELTO, en una sola lectura de sesión.
 * Lo consume el wizard (cliente) para no re-consultar al cambiar de categoría.
 */
export async function categoriasConAtributos(): Promise<{
  categorias: Categoria[];
  defsPorCategoria: Record<number, AtributoDeCategoria[]>;
}> {
  const { supabase } = await requireAdmin();
  const categorias = await leerCategorias(supabase);
  const defsPorCategoria = await leerMapaAtributosPorCategoria(
    supabase,
    categorias,
  );
  return { categorias, defsPorCategoria };
}
