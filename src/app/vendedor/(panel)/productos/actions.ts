"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVendedor } from "@/lib/vendedor/auth";
import { productoBaseSchema, type ProductoBaseInput } from "@/lib/admin/schemas";
import { slugUnico } from "@/lib/admin/slug";
import { subirImagen, borrarImagen } from "@/lib/admin/storage";
import { GATE_COBROS } from "@/lib/producto-wizard";
import type { ActionState } from "@/lib/admin/types";

const n = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);

const CONFLICTO =
  "Modificaste esta pieza desde otra pestaña o dispositivo. Recarga la página para ver la versión más reciente.";

/**
 * Whitelist server-side (sin mass assignment). El vendedor NUNCA fija:
 *  - `artesano_id`: lo impone el servidor desde requireVendedor() (anti-IDOR).
 *  - `precio_centavos`: se calcula de `precio_pesos` (autoridad de precio §2).
 * No hay más campos sensibles en `productos` (comisión/status de artesano viven
 * en la tabla `artesanos`, fuera del alcance de este form).
 */
function toRow(d: ProductoBaseInput, artesanoId: string) {
  return {
    artesano_id: artesanoId, // forzado por el servidor, jamás desde el cliente
    nombre: d.nombre,
    maker: n(d.maker),
    oficio: d.oficio,
    region: d.region,
    precio_centavos: d.precio_pesos * 100,
    descripcion: n(d.descripcion),
    tecnica: n(d.tecnica),
    materiales: n(d.materiales),
    medidas: n(d.medidas),
    status: d.status,
  };
}

export async function crearMiProducto(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, artesanoId } = await requireVendedor();
  const parsed = productoBaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // El slug (id) se genera del nombre en el servidor — el artesano no lo teclea.
  const id = await slugUnico(supabase, "productos", "id", d.nombre);

  let img: { url: string; path: string } | null = null;
  const file = formData.get("imagen");
  if (file instanceof File && file.size > 0) {
    try {
      // Carpeta acotada por la RLS de storage del vendedor (0008): vendedor/<id>/.
      img = await subirImagen(supabase, file, `vendedor/${artesanoId}`);
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
  }

  const { error } = await supabase
    .from("productos")
    .insert({ id, imagen: img?.url ?? null, ...toRow(d, artesanoId) });
  if (error) {
    if (img) await borrarImagen(supabase, img.path); // limpia el huérfano
    if (error.message.includes("cobros_no_habilitados")) return { message: GATE_COBROS };
    if (error.message.includes("duplicate"))
      return { message: "Ya tienes una pieza con un nombre muy parecido. Cambia el nombre." };
    console.error("crearMiProducto:", error.message); // detalle solo en el server
    return { message: "No se pudo crear la pieza. Revisa los datos e intenta de nuevo." };
  }
  revalidatePath("/vendedor/productos");
  revalidatePath("/tienda");
  redirect("/vendedor/productos");
}

export async function actualizarMiProducto(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, artesanoId } = await requireVendedor();
  const id = String(formData.get("id") ?? "");
  const lockTs = String(formData.get("updated_at") ?? "");
  if (!id) return { message: "Falta el identificador." };
  const parsed = productoBaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const row: Record<string, unknown> = toRow(parsed.data, artesanoId);

  // Imagen nueva (opcional): se sube primero; se limpia si el update no procede.
  let nuevoPath: string | null = null;
  let viejaImg: string | null = null;
  const file = formData.get("imagen");
  if (file instanceof File && file.size > 0) {
    try {
      // Carpeta acotada por la RLS de storage del vendedor (0008): vendedor/<id>/.
      const up = await subirImagen(supabase, file, `vendedor/${artesanoId}`);
      row.imagen = up.url;
      nuevoPath = up.path;
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
    const { data: actual } = await supabase
      .from("productos")
      .select("imagen")
      .eq("id", id)
      .eq("artesano_id", artesanoId)
      .maybeSingle();
    viejaImg = (actual?.imagen as string) ?? null;
  }

  // Locking optimista + scope por dueño. El `.eq("artesano_id", artesanoId)` es
  // la barrera anti-IDOR de la app: un vendedor no actualiza la pieza de otro
  // aunque adivine el id o la RLS fallara.
  let q = supabase
    .from("productos")
    .update(row)
    .eq("id", id)
    .eq("artesano_id", artesanoId);
  if (lockTs) q = q.eq("updated_at", lockTs);
  const { data: upd, error } = await q.select("id");

  if (error) {
    if (nuevoPath) await borrarImagen(supabase, nuevoPath);
    if (error.message.includes("cobros_no_habilitados")) return { message: GATE_COBROS };
    console.error("actualizarMiProducto:", error.message);
    return { message: "No se pudo guardar la pieza. Intenta de nuevo." };
  }
  if (!upd || upd.length === 0) {
    if (nuevoPath) await borrarImagen(supabase, nuevoPath);
    const { data: existe } = await supabase
      .from("productos")
      .select("id")
      .eq("id", id)
      .eq("artesano_id", artesanoId)
      .maybeSingle();
    return { message: existe ? CONFLICTO : "La pieza ya no existe o no es tuya." };
  }

  // Reemplazo exitoso: borra la imagen anterior (best-effort).
  if (nuevoPath && viejaImg) await borrarImagen(supabase, viejaImg);

  revalidatePath("/vendedor/productos");
  revalidatePath("/tienda");
  revalidatePath(`/tienda/${id}`);
  redirect("/vendedor/productos");
}

export async function eliminarMiProducto(formData: FormData): Promise<void> {
  const { supabase, artesanoId } = await requireVendedor();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { data: p } = await supabase
      .from("productos")
      .select("imagen")
      .eq("id", id)
      .eq("artesano_id", artesanoId)
      .maybeSingle();
    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id)
      .eq("artesano_id", artesanoId);
    // Solo borrar la imagen si la fila se eliminó de verdad.
    if (!error && p?.imagen) await borrarImagen(supabase, p.imagen as string);
  }
  revalidatePath("/vendedor/productos");
  revalidatePath("/tienda");
  redirect("/vendedor/productos");
}
