"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { invitarSchema } from "@/lib/vendedor/schemas";
import {
  generarEnlaceInvitacion,
  generarInvitacionRegistro,
} from "@/lib/vendedor/invitaciones";
import type { ActionState } from "@/lib/admin/types";

/** Estado de retorno del invitar: además del mensaje, el link para compartir. */
export type InvitarState = ActionState & {
  link?: string;
  expiraEn?: string; // ISO
};

/**
 * Genera una invitación para un artesano existente y devuelve el link
 * `/unirse?t=...` que el admin comparte por WhatsApp.
 *
 * Seguridad:
 *  - requireAdmin() es la autoridad (una Server Action es un POST público).
 *  - El token en claro se genera aquí y se DEVUELVE UNA sola vez (para el link);
 *    en BD guardamos solo su hash. No se puede recuperar después.
 *  - Verificamos que el artesano exista bajo RLS admin (anti-IDOR / FK basura).
 *  - Sin mass assignment: solo escribimos columnas controladas por el servidor.
 */
export async function invitarArtesano(
  _prev: InvitarState,
  formData: FormData,
): Promise<InvitarState> {
  const { user, supabase } = await requireAdmin();

  const parsed = invitarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const { artesano_id } = parsed.data;

  // El artesano debe existir (y ser visible bajo RLS admin). Evita crear
  // invitaciones colgando de un id arbitrario enviado por el cliente.
  const { data: artesano, error: eArt } = await supabase
    .from("artesanos")
    .select("id,nombre,user_id")
    .eq("id", artesano_id)
    .maybeSingle();
  if (eArt) {
    console.error("invitarArtesano select:", eArt.message);
    return { message: "No se pudo generar la invitación. Intenta de nuevo." };
  }
  if (!artesano) return { message: "Ese artesano ya no existe." };
  if (artesano.user_id) {
    return { message: "Este artesano ya tiene una cuenta vinculada." };
  }

  // Genera (o regenera) el enlace: revoca las vigentes previas y guarda el hash del
  // token nuevo. El `email` de invitarSchema es solo referencia y NO se usa para enviar
  // nada — el admin comparte el link a mano (copiar/WhatsApp).
  try {
    const h = await headers();
    const { link, expiraEn } = await generarEnlaceInvitacion(
      supabase,
      artesano_id,
      user.id,
      h.get("host"),
    );
    revalidatePath(`/admin/artesanos/${artesano_id}`);
    revalidatePath("/admin/artesanos");
    return {
      ok: true,
      message: `Invitación lista para ${artesano.nombre}. Comparte el enlace; caduca en 7 días.`,
      link,
      expiraEn,
    };
  } catch (e) {
    console.error("invitarArtesano:", e instanceof Error ? e.message : e);
    return { message: "No se pudo generar la invitación. Intenta de nuevo." };
  }
}

/**
 * NUEVO MODELO (0013): invitación de REGISTRO sin artesano previo. El admin solo genera
 * el link; el artesano se crea al reclamar (registro autoguiado, llena TODO). No hay
 * formulario en el admin: solo este botón de "link".
 */
export async function invitarRegistro(
  _prev: InvitarState,
  _formData: FormData,
): Promise<InvitarState> {
  const { user, supabase } = await requireAdmin();
  try {
    const h = await headers();
    const { link, expiraEn } = await generarInvitacionRegistro(
      supabase,
      user.id,
      h.get("host"),
    );
    revalidatePath("/admin/artesanos");
    return {
      ok: true,
      message: "Invitación de registro lista. Compártela; caduca en 7 días.",
      link,
      expiraEn,
    };
  } catch (e) {
    console.error("invitarRegistro:", e instanceof Error ? e.message : e);
    return { message: "No se pudo generar la invitación. Intenta de nuevo." };
  }
}

/** Revoca una invitación PENDIENTE (sella `revocada_en`). Admin. */
export async function revocarInvitacion(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase
      .from("invitaciones")
      .update({ revocada_en: new Date().toISOString() })
      .eq("id", id)
      .is("usado_en", null);
  }
  revalidatePath("/admin/artesanos");
}
