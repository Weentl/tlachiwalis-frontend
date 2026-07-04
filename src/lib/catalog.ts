import {
  products as staticProducts,
  oficios as staticOficios,
  type Product,
  type CardProducto,
} from "@/lib/products";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";

// Lee de Supabase si está configurado; si no (o si algo falla), usa el catálogo estático.
// Fuente: la vista public.productos_storefront (0009 PARTE F), SECURITY INVOKER, que
// reproduce EXACTO las 11 columnas históricas y añade precio_desde / disponible_total.
// La vista NO expone `status` ni `created_at`: filtra a "publicado" vía la RLS del
// llamante (anon → productos_publicados_select de 0001), por eso aquí NO va .eq(status)
// ni .order(created_at) (esas columnas no existen en la vista). Se ordena por nombre
// para un orden estable. El fallback estático (staticProducts) queda intacto ⇒ cero downtime.
const COLS_STOREFRONT =
  "id,nombre,maker,oficio,region,precio_centavos,imagen,descripcion,tecnica,materiales,medidas";

type FilaStorefront = Record<string, unknown>;

function mapProducto(r: FilaStorefront): Product {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    oficio: r.oficio as string,
    region: r.region as string,
    maker: (r.maker as string) ?? "",
    precio: Math.round(((r.precio_centavos as number) ?? 0) / 100),
    img: (r.imagen as string) ?? "",
    descripcion: (r.descripcion as string) ?? "",
    tecnica: (r.tecnica as string) ?? "",
    materiales: (r.materiales as string) ?? "",
    medidas: (r.medidas as string) ?? "",
  };
}

export async function getProducts(): Promise<Product[]> {
  if (!supabaseConfigured) return staticProducts;
  try {
    const { data, error } = await supabaseServer()
      .from("productos_storefront")
      .select(COLS_STOREFRONT)
      .order("nombre", { ascending: true });

    if (error || !data || data.length === 0) return staticProducts;
    return data.map(mapProducto);
  } catch {
    return staticProducts;
  }
}

// Detalle por id: query DIRECTA (antes traía TODO el catálogo y filtraba en memoria).
export async function getProduct(id: string): Promise<Product | undefined> {
  if (!supabaseConfigured) return staticProducts.find((p) => p.id === id);
  try {
    const { data, error } = await supabaseServer()
      .from("productos_storefront")
      .select(COLS_STOREFRONT)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return staticProducts.find((p) => p.id === id);
    return mapProducto(data);
  } catch {
    return staticProducts.find((p) => p.id === id);
  }
}

export async function getOficios(): Promise<string[]> {
  if (!supabaseConfigured) return staticOficios;
  const all = await getProducts();
  const set = Array.from(new Set(all.map((p) => p.oficio)));
  return set.length ? set : staticOficios;
}

// ── Lectores del comprador (vista ampliada 0022, SIN fallback demo) ───────────
// A diferencia de getProducts(), estos NO caen al catálogo estático: 0 filas = "sin
// resultados" real (para búsqueda/filtros/página de artesano, F5/F4).
const COLS_CARD =
  "id,nombre,maker,oficio,region,precio_centavos,imagen,precio_desde,disponible_total,artesano_id,artesano_slug,categoria_id,tipo_producto,destacado,tendencia,publicado_en";

function mapCard(r: Record<string, unknown>): CardProducto {
  const precioCent = (r.precio_centavos as number) ?? 0;
  const desdeCent = (r.precio_desde as number) ?? precioCent;
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    maker: (r.maker as string) ?? "",
    oficio: (r.oficio as string) ?? "",
    region: (r.region as string) ?? "",
    precio: Math.round(precioCent / 100),
    precioDesde: Math.round(desdeCent / 100),
    esDesde: desdeCent !== precioCent,
    img: (r.imagen as string) ?? "",
    disponibleTotal: Number(r.disponible_total ?? 0),
    tipo: (r.tipo_producto as string) ?? "",
    artesanoSlug: (r.artesano_slug as string) ?? null,
    categoriaId: (r.categoria_id as number | null) ?? null,
    destacado: Boolean(r.destacado),
    tendencia: Boolean(r.tendencia),
    publicadoEn: (r.publicado_en as string) ?? "",
  };
}

// Todas las piezas publicadas para el storefront/búsqueda.
export async function getPiezas(): Promise<CardProducto[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabaseServer()
      .from("productos_storefront")
      .select(COLS_CARD)
      .order("nombre", { ascending: true });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(mapCard);
  } catch {
    return [];
  }
}

// Piezas publicadas de un artesano (RLS ya limita a 'publicado').
export async function getPiezasDeArtesano(artesanoId: string): Promise<CardProducto[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabaseServer()
      .from("productos_storefront")
      .select(COLS_CARD)
      .eq("artesano_id", artesanoId)
      .order("nombre", { ascending: true });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(mapCard);
  } catch {
    return [];
  }
}
