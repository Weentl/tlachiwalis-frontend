"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { artesanoSchema, type ArtesanoInput } from "@/lib/admin/schemas";
import { slugUnico } from "@/lib/admin/slug";
import { subirImagen, borrarImagen } from "@/lib/admin/storage";
import { generarEnlaceInvitacion } from "@/lib/vendedor/invitaciones";
import { headers } from "next/headers";
import type { ActionState } from "@/lib/admin/types";
import type { InvitarState } from "./invitar-actions";

const n = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);

const CONFLICTO =
  "Otro administrador modificó este artesano mientras lo editabas. Recarga la página para ver los datos más recientes.";

function toRow(d: ArtesanoInput, fotoUrl: string | null) {
  return {
    nombre: d.nombre,
    taller: n(d.taller),
    contacto: n(d.contacto),
    semblanza: n(d.semblanza),
    region: n(d.region),
    oficio: n(d.oficio),
    foto_url: fotoUrl,
    // rfc/regimen/clabe NO se escriben desde el panel (van por Stripe, Fase 6).
    // status NO va aquí: create=pausado (abajo); edición vía "Acceso y seguridad".
  };
}

export async function crearArtesano(
  _prev: InvitarState,
  formData: FormData,
): Promise<InvitarState> {
  const { supabase, user } = await requireAdmin();
  const parsed = artesanoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  // Foto por upload (opcional).
  let fotoPath: string | null = null;
  let fotoUrl: string | null = n(parsed.data.foto_url);
  const file = formData.get("foto");
  if (file instanceof File && file.size > 0) {
    try {
      const up = await subirImagen(supabase, file, "artesanos");
      fotoUrl = up.url;
      fotoPath = up.path;
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
  }

  // El slug se genera del nombre en el servidor (el artesano no lo teclea).
  const slug = await slugUnico(supabase, "artesanos", "slug", parsed.data.nombre);
  // Nace INACTIVO ('pausado'): se activa solo cuando el artesano reclama su cuenta
  // (apps/api /sellers/claim pone status='activo'). status forzado por el servidor.
  const { data: creado, error } = await supabase
    .from("artesanos")
    .insert({ slug, status: "pausado", ...toRow(parsed.data, fotoUrl) })
    .select("id")
    .maybeSingle();
  if (error) {
    if (fotoPath) await borrarImagen(supabase, fotoPath);
    if (error.message.includes("duplicate"))
      return { message: "Ya existe un artesano con ese nombre (misma dirección web). Cámbialo." };
    console.error("crearArtesano:", error.message);
    return { message: "No se pudo crear el artesano. Revisa los datos e intenta de nuevo." };
  }
  revalidatePath("/admin/artesanos");

  // Genera su enlace de invitación de una vez → el admin lo copia/manda desde el modal.
  const nuevoId = (creado as { id: string } | null)?.id;
  if (!nuevoId)
    return { ok: true, message: "Artesano creado. Genera su enlace desde la lista." };
  try {
    const h = await headers();
    const { link, expiraEn } = await generarEnlaceInvitacion(
      supabase,
      nuevoId,
      user.id,
      h.get("host"),
    );
    return {
      ok: true,
      message: "Artesano creado (inactivo). Comparte su enlace; caduca en 7 días.",
      link,
      expiraEn,
    };
  } catch (e) {
    console.error("crearArtesano/invitacion:", e instanceof Error ? e.message : e);
    return {
      ok: true,
      message: "Artesano creado, pero no se pudo generar el enlace. Genéralo desde la lista.",
    };
  }
}

export async function actualizarArtesano(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const lockTs = String(formData.get("updated_at") ?? "");
  if (!id) return { message: "Falta el identificador." };
  const parsed = artesanoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  let fotoPath: string | null = null;
  let viejaFoto: string | null = null;
  let fotoUrl: string | null = n(parsed.data.foto_url); // hidden = la actual
  const file = formData.get("foto");
  if (file instanceof File && file.size > 0) {
    try {
      const up = await subirImagen(supabase, file, "artesanos");
      fotoUrl = up.url;
      fotoPath = up.path;
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
    const { data: actual } = await supabase
      .from("artesanos")
      .select("foto_url")
      .eq("id", id)
      .maybeSingle();
    viejaFoto = (actual?.foto_url as string) ?? null;
  }

  let q = supabase.from("artesanos").update(toRow(parsed.data, fotoUrl)).eq("id", id);
  if (lockTs) q = q.eq("updated_at", lockTs);
  const { data: upd, error } = await q.select("id");

  if (error) {
    if (fotoPath) await borrarImagen(supabase, fotoPath);
    console.error("actualizarArtesano:", error.message);
    return { message: "No se pudo guardar el artesano. Intenta de nuevo." };
  }
  if (!upd || upd.length === 0) {
    if (fotoPath) await borrarImagen(supabase, fotoPath);
    const { data: existe } = await supabase
      .from("artesanos")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return { message: existe ? CONFLICTO : "El artesano ya no existe." };
  }
  if (fotoPath && viejaFoto) await borrarImagen(supabase, viejaFoto);

  revalidatePath("/admin/artesanos");
  revalidatePath(`/admin/artesanos/${id}`);
  redirect("/admin/artesanos");
}

// ── Acceso / seguridad ──────────────────────────────────────────────────────
// Suspender (pausar) corta el acceso del artesano AL INSTANTE: es_vendedor() y
// mi_artesano_id() (0010) dejan de resolver → no puede entrar a su panel ni tocar
// sus piezas/fotos por RLS. Úsalo si su cuenta fue comprometida. Es reversible.
// Whitelist: solo `status` (sin mass assignment). El admin puede actualizar por RLS.
export async function desactivarArtesano(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("artesanos").update({ status: "pausado" }).eq("id", id);
  revalidatePath("/admin/artesanos");
  revalidatePath(`/admin/artesanos/${id}`);
  revalidatePath("/tienda");
  redirect(`/admin/artesanos/${id}`);
}

export async function reactivarArtesano(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("artesanos").update({ status: "activo" }).eq("id", id);
  revalidatePath("/admin/artesanos");
  revalidatePath(`/admin/artesanos/${id}`);
  revalidatePath("/tienda");
  redirect(`/admin/artesanos/${id}`);
}

// Aprobar una SOLICITUD de registro pendiente: 'pendiente' → 'activo'. Solo entonces el
// artesano puede acceder a su panel (es_vendedor exige 'activo'). Rechazar = eliminarArtesano
// (borra + purga la cuenta auth). El `.eq("status","pendiente")` evita reactivar por error uno
// suspendido a través de esta ruta.
export async function aprobarArtesano(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id)
    await supabase
      .from("artesanos")
      .update({ status: "activo" })
      .eq("id", id)
      .eq("status", "pendiente");
  revalidatePath("/admin/artesanos");
  revalidatePath("/tienda");
  redirect("/admin/artesanos");
}

// Purga la cuenta auth ligada (service_role vía apps/api). Best-effort, nunca lanza:
// aun sin purgar, el artesano borrado queda sin vínculo → sin acceso de vendedor.
async function purgarCuentaAuth(artesanoId: string): Promise<void> {
  const base =
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "");
  const token = process.env.CLAIM_SERVICE_TOKEN;
  if (!base || !token) return;
  try {
    await fetch(`${base}/sellers/purge`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ artesanoId }),
      cache: "no-store",
    });
  } catch {
    // apps/api caído: el borrado del artesano (unlink) igual corta el acceso.
  }
}

// Borrado SEGURO: la función SQL despublica y desvincula sus piezas, luego borra
// (atómico). Las piezas NO se pierden: quedan en 'borrador' sin artesano. Si el
// artesano tenía cuenta (caso hackeo), se purga su login primero (service_role).
export async function eliminarArtesano(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const { data: a } = await supabase
      .from("artesanos")
      .select("foto_url,foto_portada,user_id")
      .eq("id", id)
      .maybeSingle();
    // Purgar el auth.user ANTES de borrar (necesitamos su user_id). Best-effort.
    if (a?.user_id) await purgarCuentaAuth(id);
    const { error } = await supabase.rpc("eliminar_artesano_seguro", { p_id: id });
    // Solo borrar las fotos si el artesano se eliminó de verdad (anti-huérfanos en Storage).
    if (!error) {
      if (a?.foto_url) await borrarImagen(supabase, a.foto_url as string);
      if (a?.foto_portada) await borrarImagen(supabase, a.foto_portada as string);
    }
  }
  revalidatePath("/admin/artesanos");
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
  redirect("/admin/artesanos");
}
