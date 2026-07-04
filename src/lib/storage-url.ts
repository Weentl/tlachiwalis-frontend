// URL pública de un storage_path RELATIVO del bucket 'piezas' (0009 guarda paths
// relativos, no URLs). Client-safe: usa NEXT_PUBLIC_SUPABASE_URL (público por
// diseño; nunca la service_role). Se usa para previsualizar la galería en EDITAR,
// donde solo tenemos el path relativo. No es sensible: el bucket es público.

const BUCKET = "piezas";

export function urlPublicaPieza(storagePath: string | null | undefined): string {
  if (!storagePath) return "";
  // Ya es absoluta (legado): úsala tal cual.
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  // Cualquier ruta ABSOLUTA de la app (/storage/… del rewrite, o /images/… demo del /public):
  // úsala tal cual. Solo las LLAVES relativas del bucket reciben el prefijo de abajo.
  if (storagePath.startsWith("/")) return storagePath;
  // Path relativo (llave) → URL RELATIVA same-origin, servida por el rewrite de next.config.
  // Host-portable y sin depender de que NEXT_PUBLIC_SUPABASE_URL esté inlined en el cliente.
  return `/storage/v1/object/public/${BUCKET}/${storagePath.replace(/^\/+/, "")}`;
}
