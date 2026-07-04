import "server-only";
import { requireAdmin } from "@/lib/admin/auth";
import type {
  ImagenProducto,
  ProductoAdmin,
  VarianteConInventario,
} from "@/lib/admin/types";

// Columnas de productos. Ampliadas en 0009 (PARTE A) con el modelo de producto:
// categoria_id/atributos/tipo_producto, dimensiones de empaque, clave_prod_serv y
// valor_declarado_centavos. Todas nullable/con default en BD → aditivas.
const COLS =
  "id,artesano_id,nombre,maker,oficio,region,precio_centavos,moneda,imagen,descripcion,tecnica,materiales,medidas,status,categoria_id,atributos,tipo_producto,peso_gramos,largo_mm,ancho_mm,alto_mm,clave_prod_serv,valor_declarado_centavos,created_at,updated_at";

// Variantes + su inventario 1:1 (embed por la FK inventario.variante_id).
const VARIANTE_COLS =
  "id,producto_id,sku,opciones,precio_delta_centavos,imagen_variante_id,activa,created_at,inventario(variante_id,stock,reservado,disponible,permitir_backorder,updated_at)";
const IMAGEN_COLS =
  "id,producto_id,variante_id,storage_path,alt,orden,es_principal,ancho,alto,bytes,created_at";

// El admin ve TODOS los status (borrador/publicado/agotado) vía la policy
// productos_admin_select. Propaga errores (no degrada a estático).
export async function listarProductos(): Promise<ProductoAdmin[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("productos")
    .select(COLS)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron leer productos: ${error.message}`);
  return (data ?? []) as ProductoAdmin[];
}

// Nº de piezas de un artesano (para avisar la consecuencia del borrado).
export async function contarPiezas(artesanoId: string): Promise<number> {
  const { supabase } = await requireAdmin();
  const { count } = await supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
    .eq("artesano_id", artesanoId);
  return count ?? 0;
}

export async function getProductoAdmin(
  id: string,
): Promise<ProductoAdmin | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("productos")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProductoAdmin) ?? null;
}

// PostgREST embebe una relación to-one como objeto (o null) cuando la detecta 1:1,
// pero puede devolver arreglo en otros casos. Normalizamos a la primera fila / null.
type InvRow = VarianteConInventario["inventario"];
function unwrapInventario(inv: InvRow | InvRow[] | null | undefined): InvRow {
  if (Array.isArray(inv)) return inv[0] ?? null;
  return inv ?? null;
}

/**
 * Variantes de un producto (con su inventario 1:1). El admin las ve TODAS vía la
 * policy producto_variantes_admin_all (0009 D.1). Propaga errores (no degrada).
 * Ordena por created_at para que la variante default (creada primero) quede arriba.
 */
export async function getVariantes(
  productoId: string,
): Promise<VarianteConInventario[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("producto_variantes")
    .select(VARIANTE_COLS)
    .eq("producto_id", productoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron leer variantes: ${error.message}`);
  return ((data ?? []) as unknown[]).map((r) => {
    const row = r as VarianteConInventario & { inventario: InvRow | InvRow[] };
    return { ...row, inventario: unwrapInventario(row.inventario) };
  });
}

/**
 * Galería (producto_imagenes) de un producto. Devuelve storage_path RELATIVO; la
 * URL pública se construye en el consumidor con getPublicUrl(path) (Fase 2). El
 * admin ve toda la galería vía producto_imagenes_admin_all (0009 D.3).
 */
export async function getGaleria(
  productoId: string,
): Promise<ImagenProducto[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("producto_imagenes")
    .select(IMAGEN_COLS)
    .eq("producto_id", productoId)
    .order("orden", { ascending: true });
  if (error) throw new Error(`No se pudo leer la galería: ${error.message}`);
  return (data ?? []) as ImagenProducto[];
}
