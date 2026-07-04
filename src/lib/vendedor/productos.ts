import "server-only";
import { requireVendedor } from "@/lib/vendedor/auth";
import type {
  ImagenProducto,
  ProductoAdmin,
  VarianteConInventario,
} from "@/lib/admin/types";

// Reusa la MISMA forma de fila que el admin (ProductoAdmin): las columnas son las
// mismas; lo único que cambia es el SCOPE (solo las piezas del vendedor).
// Ampliadas en 0009 (PARTE A) con el modelo de producto (mismas columnas que admin).
const COLS =
  "id,artesano_id,nombre,maker,oficio,region,precio_centavos,moneda,imagen,descripcion,tecnica,materiales,medidas,status,categoria_id,atributos,tipo_producto,peso_gramos,largo_mm,ancho_mm,alto_mm,clave_prod_serv,valor_declarado_centavos,created_at,updated_at";

const VARIANTE_COLS =
  "id,producto_id,sku,opciones,precio_delta_centavos,imagen_variante_id,activa,created_at,inventario(variante_id,stock,reservado,disponible,permitir_backorder,updated_at)";
const IMAGEN_COLS =
  "id,producto_id,variante_id,storage_path,alt,orden,es_principal,ancho,alto,bytes,created_at";

/**
 * Lista SOLO las piezas del artesano del vendedor. Aunque la RLS "dueño" (0008)
 * ya filtra por `artesano_id`, filtramos TAMBIÉN aquí por `artesanoId` de la DAL
 * (defensa en profundidad, anti-IDOR). Propaga errores (no degrada a estático).
 */
export async function listarMisProductos(): Promise<ProductoAdmin[]> {
  const { supabase, artesanoId } = await requireVendedor();
  const { data, error } = await supabase
    .from("productos")
    .select(COLS)
    .eq("artesano_id", artesanoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron leer tus piezas: ${error.message}`);
  return (data ?? []) as ProductoAdmin[];
}

/**
 * Trae una pieza del vendedor por id. El `.eq("artesano_id", ...)` es la barrera
 * anti-IDOR en la app: un vendedor no puede abrir la pieza de otro por URL aunque
 * la RLS fallara. Devuelve null si no existe o no es suya.
 */
export async function getMiProducto(id: string): Promise<ProductoAdmin | null> {
  const { supabase, artesanoId } = await requireVendedor();
  const { data, error } = await supabase
    .from("productos")
    .select(COLS)
    .eq("id", id)
    .eq("artesano_id", artesanoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProductoAdmin) ?? null;
}

// producto_variantes / producto_imagenes NO tienen `artesano_id`: la propiedad se
// hereda del producto padre. La barrera anti-IDOR en la app es confirmar PRIMERO
// que el producto es del vendedor (getMiProducto ya filtra por artesano_id) y solo
// entonces leer sus hijos. Si la pieza no es suya, devolvemos [] (nunca datos de otro).
type InvRow = VarianteConInventario["inventario"];
function unwrapInventario(inv: InvRow | InvRow[] | null | undefined): InvRow {
  if (Array.isArray(inv)) return inv[0] ?? null;
  return inv ?? null;
}

/**
 * Variantes (con inventario) de UNA pieza del vendedor. Verifica propiedad de la
 * pieza antes de leer las variantes (defensa en profundidad sobre la RLS "dueño"
 * de 0009 D.1). Devuelve [] si la pieza no existe o no es del vendedor.
 */
export async function getMisVariantes(
  productoId: string,
): Promise<VarianteConInventario[]> {
  // getMiProducto ya llama requireVendedor y filtra por artesano_id (scope de
  // propiedad, anti-IDOR). requireVendedor está memoizado por request (React cache),
  // así que la doble llamada no re-consulta la red.
  const propia = await getMiProducto(productoId);
  if (!propia) return [];

  const { supabase } = await requireVendedor();
  const { data, error } = await supabase
    .from("producto_variantes")
    .select(VARIANTE_COLS)
    .eq("producto_id", productoId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron leer tus variantes: ${error.message}`);
  return ((data ?? []) as unknown[]).map((r) => {
    const row = r as VarianteConInventario & { inventario: InvRow | InvRow[] };
    return { ...row, inventario: unwrapInventario(row.inventario) };
  });
}

/**
 * Galería de UNA pieza del vendedor. Misma barrera anti-IDOR: confirma propiedad
 * antes de leer. Devuelve storage_path RELATIVO (la URL se arma en el consumidor).
 */
export async function getMiGaleria(
  productoId: string,
): Promise<ImagenProducto[]> {
  const { supabase } = await requireVendedor();

  const propia = await getMiProducto(productoId);
  if (!propia) return [];

  const { data, error } = await supabase
    .from("producto_imagenes")
    .select(IMAGEN_COLS)
    .eq("producto_id", productoId)
    .order("orden", { ascending: true });
  if (error) throw new Error(`No se pudo leer tu galería: ${error.message}`);
  return (data ?? []) as ImagenProducto[];
}
