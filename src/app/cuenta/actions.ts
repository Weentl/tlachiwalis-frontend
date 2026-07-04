"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireComprador } from "@/lib/comprador/auth";
import { oficios } from "@/lib/products";
import type { ActionState } from "@/lib/admin/types";

function apiBase(): string | null {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.CLAIM_SERVICE_URL?.replace(/\/sellers\/claim\/?$/, "") ??
    null
  );
}

const perfilSchema = z.object({
  nombre: z.string().trim().max(120).optional().default(""),
  apellido: z.string().trim().max(120).optional().default(""),
  telefono: z.string().trim().max(20).optional().default(""),
});

export async function actualizarPerfil(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireComprador();
  const parsed = perfilSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  // Whitelist estricta de campos editables (anti mass-assignment).
  const update: Record<string, unknown> = {
    nombre: parsed.data.nombre || null,
    apellido: parsed.data.apellido || null,
    telefono: parsed.data.telefono || null,
  };
  // Intereses: solo si el formulario los envía (sentinel), validados contra la lista real de oficios.
  if (formData.get("_intereses") === "1") {
    const permitido = new Set(oficios);
    update.intereses = formData
      .getAll("intereses")
      .map(String)
      .filter((o) => permitido.has(o))
      .slice(0, 12);
  }

  const { error } = await supabase.from("perfiles").update(update).eq("user_id", user.id);
  if (error) return { message: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath("/cuenta");
  return { ok: true, message: "Datos actualizados." };
}

const dirSchema = z.object({
  etiqueta: z.string().trim().max(40).optional().default(""),
  destinatario: z.string().trim().max(120).optional().default(""),
  telefono: z.string().trim().max(20).optional().default(""),
  calle: z.string().trim().min(1, "Requerido").max(160),
  colonia: z.string().trim().max(120).optional().default(""),
  ciudad: z.string().trim().min(1, "Requerido").max(120),
  estado: z.string().trim().max(120).optional().default(""),
  cp: z.string().trim().max(10).optional().default(""),
  referencias: z.string().trim().max(300).optional().default(""),
});

export async function agregarDireccion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireComprador();
  const parsed = dirSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const { error } = await supabase.from("direcciones").insert({
    user_id: user.id, // forzado por el servidor (anti-IDOR); RLS with_check lo exige
    etiqueta: d.etiqueta || null,
    destinatario: d.destinatario || null,
    telefono: d.telefono || null,
    calle: d.calle,
    colonia: d.colonia || null,
    ciudad: d.ciudad,
    estado: d.estado || null,
    cp: d.cp || null,
    referencias: d.referencias || null,
  });
  if (error) return { message: "No se pudo guardar la dirección." };
  revalidatePath("/cuenta");
  return { ok: true, message: "Dirección agregada." };
}

export async function eliminarDireccion(formData: FormData): Promise<void> {
  const { supabase, user } = await requireComprador();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("direcciones").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/cuenta");
}

// Marca una dirección como predeterminada (quita el flag de las demás del usuario).
export async function hacerPrincipal(formData: FormData): Promise<void> {
  const { supabase, user } = await requireComprador();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("direcciones").update({ es_principal: false }).eq("user_id", user.id);
  await supabase
    .from("direcciones")
    .update({ es_principal: true })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/cuenta");
}

// ARCO Oposición: activar/desactivar consentimiento de marketing (con sello de tiempo).
export async function actualizarMarketing(formData: FormData): Promise<void> {
  const { supabase, user } = await requireComprador();
  const activar = String(formData.get("valor") ?? "") === "on";
  await supabase
    .from("perfiles")
    .update({
      marketing_consent: activar,
      marketing_consent_at: activar ? new Date().toISOString() : null,
    })
    .eq("user_id", user.id);
  revalidatePath("/cuenta");
}

// ARCO Cancelación: el comprador elimina SU cuenta (2 pasos: escribir "ELIMINAR").
// La baja real la hace apps/api (service_role) autenticando con el JWT del propio comprador.
export async function eliminarCuenta(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (String(formData.get("confirmar") ?? "").trim() !== "ELIMINAR") {
    return { message: 'Escribe ELIMINAR para confirmar.' };
  }
  const { supabase } = await requireComprador();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const base = apiBase();
  if (!token || !base) return { message: "No disponible en este entorno." };

  let res: Response;
  try {
    res = await fetch(`${base}/buyers/delete-account`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return { message: "No se pudo eliminar la cuenta. Intenta de nuevo." };
  }
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !data?.ok) {
    return { message: data?.error ?? "No se pudo eliminar la cuenta." };
  }
  await supabase.auth.signOut();
  redirect("/?cuenta=eliminada");
}
