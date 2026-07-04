import "server-only";
import { supabaseServer, supabaseConfigured } from "@/lib/supabase/server";
import { leerAtributosDeCategoria } from "@/lib/taxonomia-core";
import { urlPublicaPieza } from "@/lib/storage-url";

// Datos RICOS de una pieza para el storefront: galería, atributos descriptivos con
// etiquetas humanas, y variantes + ejes (talla/color) para el selector. Lectura PÚBLICA
// (anon + RLS): las policies de 0009 dejan a anon leer imágenes/variantes/inventario solo
// de productos 'publicado'. Devuelve vacío si Supabase no está configurado (fallback plano)
// o si la pieza no existe/no está publicada.
export type ImagenPieza = { url: string; alt: string };
export type AtributoPieza = { nombre: string; valor: string };
export type OpcionEje = { valor: string; etiqueta: string; hex: string | null };
export type EjeVar = { codigo: string; nombre: string; opciones: OpcionEje[] };
export type VariantePieza = {
  id: string;
  opciones: Record<string, string>;
  precio: number; // pesos, efectivo (base + delta), recalculado en servidor
  disponible: number;
};
// Bloque público del artesano de la pieza (para "Hecho por" + link al taller).
export type ArtesanoDePieza = {
  slug: string;
  nombre: string;
  region: string | null;
  fotoUrl: string | null;
};
export type PiezaExtra = {
  imagenes: ImagenPieza[];
  atributos: AtributoPieza[];
  ejes: EjeVar[];
  variantes: VariantePieza[];
  tipo: string; // tipo_producto: 'unico' | 'stock_simple' | 'con_variantes'
  artesano: ArtesanoDePieza | null;
};

const VACIO: PiezaExtra = {
  imagenes: [],
  atributos: [],
  ejes: [],
  variantes: [],
  tipo: "",
  artesano: null,
};

export async function getPiezaExtra(id: string): Promise<PiezaExtra> {
  if (!supabaseConfigured) return VACIO;
  try {
    const sb = supabaseServer();
    const { data: p } = await sb
      .from("productos")
      .select("nombre,categoria_id,atributos,precio_centavos,tipo_producto,artesano_id")
      .eq("id", id)
      .eq("status", "publicado")
      .maybeSingle();
    if (!p) return VACIO;

    // Galería: portada primero, luego por orden. storage_path es RELATIVO (0009).
    const { data: imgs } = await sb
      .from("producto_imagenes")
      .select("storage_path,alt,orden,es_principal")
      .eq("producto_id", id)
      .order("es_principal", { ascending: false })
      .order("orden", { ascending: true });
    const imagenes: ImagenPieza[] = (imgs ?? [])
      .map((r) => ({
        url: urlPublicaPieza(r.storage_path as string),
        alt: (r.alt as string | null) ?? (p.nombre as string),
      }))
      .filter((x) => x.url);

    // Variantes activas + su inventario (1:1). precio efectivo = base + delta.
    const precioBase = (p.precio_centavos as number) ?? 0;
    const { data: vars } = await sb
      .from("producto_variantes")
      .select("id,opciones,precio_delta_centavos,inventario(disponible)")
      .eq("producto_id", id)
      .eq("activa", true);
    const variantes: VariantePieza[] = (vars ?? []).map((v) => {
      const inv = Array.isArray(v.inventario) ? v.inventario[0] : v.inventario;
      return {
        id: v.id as string,
        opciones: (v.opciones as Record<string, string>) ?? {},
        precio: Math.round(
          (precioBase + ((v.precio_delta_centavos as number) ?? 0)) / 100,
        ),
        disponible: ((inv as { disponible?: number } | null)?.disponible as number) ?? 0,
      };
    });

    // Catálogo de atributos de la categoría (para etiquetas de ficha y ejes del selector).
    const defs = p.categoria_id
      ? await leerAtributosDeCategoria(sb, p.categoria_id as number)
      : [];

    // Atributos DESCRIPTIVOS (no ejes) con etiquetas/unidades humanas.
    const atributos: AtributoPieza[] = [];
    const vals = (p.atributos ?? {}) as Record<string, string | number | boolean>;
    for (const d of defs) {
      if (d.es_variacion) continue; // talla/color → selector, no ficha
      const raw = vals[d.codigo];
      if (raw === undefined || raw === null || raw === "") continue;
      let valor: string;
      if (d.tipo === "lista")
        valor = d.opciones.find((o) => o.valor === raw)?.etiqueta ?? String(raw);
      else if (d.tipo === "booleano") valor = raw ? "Sí" : "No";
      else if (d.tipo === "numero") valor = d.unidad ? `${raw} ${d.unidad}` : String(raw);
      else valor = String(raw);
      atributos.push({ nombre: d.nombre, valor });
    }

    // Ejes de variación PRESENTES en las variantes (solo los valores realmente usados).
    const ejes: EjeVar[] = [];
    if (variantes.length > 0) {
      const usados = new Map<string, Set<string>>();
      for (const v of variantes)
        for (const [k, val] of Object.entries(v.opciones)) {
          if (!usados.has(k)) usados.set(k, new Set());
          usados.get(k)!.add(val);
        }
      for (const d of defs) {
        if (!d.es_variacion) continue;
        const vs = usados.get(d.codigo);
        if (!vs || vs.size === 0) continue;
        const opciones = d.opciones
          .filter((o) => vs.has(o.valor))
          .map((o) => ({ valor: o.valor, etiqueta: o.etiqueta, hex: o.hex }));
        if (opciones.length > 0)
          ejes.push({ codigo: d.codigo, nombre: d.nombre, opciones });
      }
    }

    // Artesano público de la pieza (vista sin PII).
    let artesano: ArtesanoDePieza | null = null;
    if (p.artesano_id) {
      const { data: a } = await sb
        .from("artesanos_publicos")
        .select("slug,nombre,region,foto_url")
        .eq("id", p.artesano_id as string)
        .maybeSingle();
      if (a)
        artesano = {
          slug: a.slug as string,
          nombre: a.nombre as string,
          region: (a.region as string | null) ?? null,
          fotoUrl: urlPublicaPieza(a.foto_url as string | null) || null,
        };
    }

    return {
      imagenes,
      atributos,
      ejes,
      variantes,
      tipo: (p.tipo_producto as string) ?? "",
      artesano,
    };
  } catch {
    return VACIO;
  }
}
