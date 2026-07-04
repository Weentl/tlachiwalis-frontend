"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { productoBaseSchema, type ProductoBaseInput } from "@/lib/admin/schemas";
import { slugUnico } from "@/lib/admin/slug";
import { subirImagen, borrarImagen } from "@/lib/admin/storage";
import type { ActionState } from "@/lib/admin/types";

const n = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);

const CONFLICTO =
  "Otro administrador modificó esta pieza mientras la editabas. Recarga la página para ver los datos más recientes.";

// Whitelist: el servidor calcula precio_centavos (autoridad de precio).
function toRow(d: ProductoBaseInput) {
  return {
    artesano_id: n(d.artesano_id),
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

export async function crearProducto(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = productoBaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // El slug (id) se genera del nombre en el servidor — el admin no lo teclea.
  const id = await slugUnico(supabase, "productos", "id", d.nombre);

  let img: { url: string; path: string } | null = null;
  const file = formData.get("imagen");
  if (file instanceof File && file.size > 0) {
    try {
      img = await subirImagen(supabase, file, "productos");
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
  }

  const { error } = await supabase
    .from("productos")
    .insert({ id, imagen: img?.url ?? null, ...toRow(d) });
  if (error) {
    if (img) await borrarImagen(supabase, img.path); // limpia el huérfano
    if (error.message.includes("duplicate"))
      return { message: "Ya existe una pieza con ese identificador (slug)." };
    console.error("crearProducto:", error.message); // detalle solo en el server
    return { message: "No se pudo crear la pieza. Revisa los datos e intenta de nuevo." };
  }
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/productos");
}

export async function actualizarProducto(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const lockTs = String(formData.get("updated_at") ?? "");
  if (!id) return { message: "Falta el identificador." };
  const parsed = productoBaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const row: Record<string, unknown> = toRow(parsed.data);

  // Imagen nueva (opcional): se sube primero; se limpia si el update no procede.
  let nuevoPath: string | null = null;
  let viejaImg: string | null = null;
  const file = formData.get("imagen");
  if (file instanceof File && file.size > 0) {
    try {
      const up = await subirImagen(supabase, file, "productos");
      row.imagen = up.url;
      nuevoPath = up.path;
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
    const { data: actual } = await supabase
      .from("productos")
      .select("imagen")
      .eq("id", id)
      .maybeSingle();
    viejaImg = (actual?.imagen as string) ?? null;
  }

  // Locking optimista: el update solo procede si updated_at no cambió.
  let q = supabase.from("productos").update(row).eq("id", id);
  if (lockTs) q = q.eq("updated_at", lockTs);
  const { data: upd, error } = await q.select("id");

  if (error) {
    if (nuevoPath) await borrarImagen(supabase, nuevoPath);
    console.error("actualizarProducto:", error.message);
    return { message: "No se pudo guardar la pieza. Intenta de nuevo." };
  }
  if (!upd || upd.length === 0) {
    if (nuevoPath) await borrarImagen(supabase, nuevoPath);
    const { data: existe } = await supabase
      .from("productos")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return { message: existe ? CONFLICTO : "La pieza ya no existe." };
  }

  // Reemplazo exitoso: borra la imagen anterior (best-effort).
  if (nuevoPath && viejaImg) await borrarImagen(supabase, viejaImg);

  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  revalidatePath(`/tienda/${id}`);
  redirect("/admin/productos");
}

export async function eliminarProducto(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { data: p } = await supabase
      .from("productos")
      .select("imagen")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("productos").delete().eq("id", id);
    // Solo borrar la imagen si la fila se eliminó de verdad.
    if (!error && p?.imagen) await borrarImagen(supabase, p.imagen as string);
  }
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/productos");
}
