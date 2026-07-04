import "server-only";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase/server";
import { urlPublicaPieza } from "@/lib/storage-url";
import { getPiezas } from "@/lib/catalog";

// Perfil PÚBLICO del artesano (vista artesanos_publicos, 0022): SOLO campos de marca, sin PII.
// Las fotos vienen como storage_path relativo → se resuelven con urlPublicaPieza (rewrite).
export type ArtesanoPublico = {
  id: string;
  slug: string;
  nombre: string;
  semblanza: string | null;
  region: string | null;
  oficio: string | null;
  fotoUrl: string | null;
  fotoPortada: string | null;
  redes: { instagram?: string | null; sitio?: string | null; facebook?: string | null } | null;
  enviaNacional: boolean;
  tipoVendedor: string | null;
  nombreNegocio: string | null;
  taller: string | null;
  aniosExperiencia: number | null;
  numPersonas: number | null;
};

const COLS_ARTESANO =
  "id,slug,nombre,semblanza,region,oficio,foto_url,foto_portada,redes,envia_nacional,tipo_vendedor,nombre_negocio,taller,anios_experiencia,num_personas";

function mapArtesano(r: Record<string, unknown>): ArtesanoPublico {
  return {
    id: r.id as string,
    slug: r.slug as string,
    nombre: r.nombre as string,
    semblanza: (r.semblanza as string) ?? null,
    region: (r.region as string) ?? null,
    oficio: (r.oficio as string) ?? null,
    fotoUrl: urlPublicaPieza(r.foto_url as string | null) || null,
    fotoPortada: urlPublicaPieza(r.foto_portada as string | null) || null,
    redes: (r.redes as ArtesanoPublico["redes"]) ?? null,
    enviaNacional: Boolean(r.envia_nacional),
    tipoVendedor: (r.tipo_vendedor as string) ?? null,
    nombreNegocio: (r.nombre_negocio as string) ?? null,
    taller: (r.taller as string) ?? null,
    aniosExperiencia: (r.anios_experiencia as number | null) ?? null,
    numPersonas: (r.num_personas as number | null) ?? null,
  };
}

export async function getArtesano(slug: string): Promise<ArtesanoPublico | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabaseServer()
      .from("artesanos_publicos")
      .select(COLS_ARTESANO)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return mapArtesano(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getArtesanos(): Promise<ArtesanoPublico[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabaseServer()
      .from("artesanos_publicos")
      .select(COLS_ARTESANO)
      .order("nombre", { ascending: true });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(mapArtesano);
  } catch {
    return [];
  }
}

// Talleres con conteo de piezas publicadas (índice /talleres).
export type Taller = ArtesanoPublico & { numPiezas: number };

export async function getTalleres(): Promise<Taller[]> {
  const [artesanos, piezas] = await Promise.all([getArtesanos(), getPiezas()]);
  const conteo = new Map<string, number>();
  for (const p of piezas) {
    if (p.artesanoSlug) conteo.set(p.artesanoSlug, (conteo.get(p.artesanoSlug) ?? 0) + 1);
  }
  return artesanos.map((a) => ({ ...a, numPiezas: conteo.get(a.slug) ?? 0 }));
}
