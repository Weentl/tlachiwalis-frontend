import "server-only";
import { requireVendedor } from "@/lib/vendedor/auth";
import {
  leerAtributos,
  leerAtributosDeCategoria,
  leerCategorias,
  leerMapaAtributosPorCategoria,
} from "@/lib/taxonomia-core";
import type { Atributo, AtributoDeCategoria, Categoria } from "@/lib/admin/types";

// Taxonomía (0007) BAJO la sesión del vendedor. Espejo de lib/admin/taxonomia.ts:
// misma lógica de resolución (lib/taxonomia-core.ts), distinto SCOPE de sesión.
// El catálogo es de lectura pública (RLS 0007), pero se lee con requireVendedor()
// para que el wizard del vendedor sea idéntico en autoridad al del admin (defensa
// en profundidad: solo un vendedor autenticado arma su formulario dinámico).

/** Categorías activas ordenadas (grid del Paso 1 del wizard del vendedor). */
export async function listarMisCategorias(): Promise<Categoria[]> {
  const { supabase } = await requireVendedor();
  return leerCategorias(supabase);
}

/** Todos los atributos del catálogo. */
export async function listarMisAtributos(): Promise<Atributo[]> {
  const { supabase } = await requireVendedor();
  return leerAtributos(supabase);
}

/** Formulario dinámico de una categoría para el wizard del vendedor. */
export async function misAtributosDeCategoria(
  categoriaId: number,
): Promise<AtributoDeCategoria[]> {
  const { supabase } = await requireVendedor();
  return leerAtributosDeCategoria(supabase, categoriaId);
}

/**
 * Categorías + su mapa de atributos PRE-RESUELTO para el wizard del vendedor.
 * Espejo de la versión admin, bajo la sesión de requireVendedor().
 */
export async function misCategoriasConAtributos(): Promise<{
  categorias: Categoria[];
  defsPorCategoria: Record<number, AtributoDeCategoria[]>;
}> {
  const { supabase } = await requireVendedor();
  const categorias = await leerCategorias(supabase);
  const defsPorCategoria = await leerMapaAtributosPorCategoria(
    supabase,
    categorias,
  );
  return { categorias, defsPorCategoria };
}
