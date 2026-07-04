import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "piezas";
const MAX_IMG = 5 * 1024 * 1024; // 5 MB
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type SubidaImagen = { url: string; path: string };

/**
 * Sube una imagen CRUDA al bucket público 'piezas' bajo `carpeta/`. La extensión
 * se deriva del MIME real (no del nombre del archivo, que puede mentir). Devuelve
 * la URL pública y el path interno (para poder borrarla si algo falla después).
 *
 * NO USAR EN GALERÍA DE PRODUCTO. La galería pasa por el pipeline
 * (lib/imagenes/pipeline.ts) y sube el WebP procesado con subirImagenProcesada().
 * subirImagen() se conserva SOLO para la foto de PERFIL de artesano (no-galería),
 * donde aún no hay pipeline.
 *
 * El admin sube a `productos/` y `artesanos/` (acceso total por RLS de 0003/0005).
 * El VENDEDOR debe subir a `vendedor/<su_artesano_id>/…`: la RLS de storage (0008)
 * solo le permite escribir bajo esa carpeta (foldername[1]='vendedor',
 * [2]=mi_artesano_id()). Por eso el tipo acepta el prefijo `vendedor/${id}`.
 */
export async function subirImagen(
  supabase: SupabaseClient,
  file: File,
  carpeta: "productos" | "artesanos" | `vendedor/${string}`,
): Promise<SubidaImagen> {
  if (!TIPOS.includes(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");
  }
  if (file.size > MAX_IMG) {
    throw new Error("La imagen supera 5 MB.");
  }
  const ext = EXT[file.type] ?? "jpg";
  const path = `${carpeta}/${globalThis.crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  // URL RELATIVA same-origin (la sirve el rewrite de next.config). Host-portable: no baja el
  // host de Supabase a la BD y no depende de alcanzar ese host desde el navegador.
  const url = `/storage/v1/object/public/${BUCKET}/${path}`;
  return { url, path };
}

/**
 * Sube un BUFFER ya procesado por el pipeline (WebP). A diferencia de
 * subirImagen(), NO valida tipo/tamaño: eso ya lo hizo procesarImagen() (magic
 * bytes + límites de píxeles/bytes). Aquí solo se deposita el WebP y se devuelve
 * url + path RELATIVO (para producto_imagenes.storage_path y para limpieza).
 *
 * Path por PRODUCTO (habilita borrado por prefijo, evita huérfanos):
 *   admin    → productos/<productoId>/<uuid>.webp
 *   vendedor → vendedor/<artesanoId>/<productoId>/<uuid>.webp
 * En ambos la RLS de storage (0008) solo mira foldername[1] y [2]:
 *   productos/… → [1]='productos' (admin_all).
 *   vendedor/<artesanoId>/… → [1]='vendedor', [2]=mi_artesano_id() (vendedor_all).
 * La sub-carpeta por producto es transparente para la RLS. La carpeta la fija el
 * servidor (WizardCtx.carpeta), NUNCA el cliente (anti-IDOR).
 */
export async function subirImagenProcesada(
  supabase: SupabaseClient,
  buffer: Buffer,
  carpeta: "productos" | `vendedor/${string}`,
  productoId: string,
  contentType: string = "image/webp",
): Promise<SubidaImagen> {
  const path = `${carpeta}/${productoId}/${globalThis.crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  // URL RELATIVA same-origin (la sirve el rewrite de next.config). Host-portable: no baja el
  // host de Supabase a la BD y no depende de alcanzar ese host desde el navegador.
  const url = `/storage/v1/object/public/${BUCKET}/${path}`;
  return { url, path };
}

/** Extrae el path interno de una URL pública del bucket (o null si no es de aquí). */
export function pathDesdeUrl(url: string | null): string | null {
  if (!url) return null;
  const marca = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i === -1 ? null : url.slice(i + marca.length);
}

/**
 * Borra una imagen del bucket de forma segura. Acepta path o URL pública. Nunca
 * lanza: la limpieza de huérfanos es best-effort (no debe tumbar la operación).
 */
export async function borrarImagen(
  supabase: SupabaseClient,
  pathOrUrl: string | null,
): Promise<void> {
  if (!pathOrUrl) return;
  // Acepta URL absoluta (legado), URL relativa /storage/... o el path llave directo.
  const path = pathDesdeUrl(pathOrUrl) ?? pathOrUrl;
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // best-effort; si falla, queda un huérfano pero no rompemos el flujo.
  }
}
