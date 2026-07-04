"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVendedor } from "@/lib/vendedor/auth";
import { subirImagen, borrarImagen } from "@/lib/admin/storage";
import { OFICIOS } from "@/lib/admin/catalogos";
import type { ActionState } from "@/lib/admin/types";

const emptyToUndef = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s == null ? undefined : s;
};
const numOrUndef = (v: unknown) => (v === "" || v == null ? undefined : v);

// El vendedor edita TODA su información de registro + perfil público. Whitelist ESTRICTA
// (anti mass-assignment, regla 5 CLAUDE.md): JAMÁS toca status / user_id / slug / cobros_* /
// stripe_account_id / rfc / regimen_fiscal / clabe / commission (admin o Stripe). La RLS
// "dueño" (0008) acota la fila a user_id=auth.uid(); el .eq(artesanoId) —de requireVendedor(),
// no del cliente— es la barrera anti-IDOR en la app.
const perfilSchema = z.object({
  nombres: z.preprocess(emptyToUndef, z.string().min(1, "Requerido").max(80)),
  apellidoP: z.preprocess(emptyToUndef, z.string().min(1, "Requerido").max(80)),
  apellidoM: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  telefono: z.preprocess(
    emptyToUndef,
    z.string().regex(/^\d{10}$/, "Teléfono de 10 dígitos").optional(),
  ),
  fechaNac: z.preprocess(emptyToUndef, z.string().optional()),
  tipoVendedor: z.enum(["persona", "taller", "tienda"]),
  nombreNegocio: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  numPersonas: z.preprocess(numOrUndef, z.coerce.number().int().positive().max(9999).optional()),
  aniosExp: z.preprocess(numOrUndef, z.coerce.number().int().nonnegative().max(120).optional()),
  region: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  ciudad: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  oficio: z.preprocess(
    emptyToUndef,
    z
      .string()
      .optional()
      .refine(
        (v) => v === undefined || (OFICIOS as readonly string[]).includes(v),
        "Oficio inválido",
      ),
  ),
  semblanza: z.preprocess(emptyToUndef, z.string().max(2000, "Máximo 2000 caracteres").optional()),
  instagram: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  sitio: z.preprocess(emptyToUndef, z.string().max(200).optional()),
  // Checkbox: presente="on" si marcado, ausente si no.
  enviaNacional: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  foto_url: z.preprocess(emptyToUndef, z.string().optional()),
});

// Coherencia de la modalidad (backend, NO solo el ocultado en UI): evita que un cliente
// malicioso mande combinaciones ilógicas.
const perfilSchemaValidado = perfilSchema.superRefine((d, ctx) => {
  if (d.tipoVendedor === "persona") {
    if (d.nombreNegocio)
      ctx.addIssue({ path: ["nombreNegocio"], code: "custom", message: "No aplica para cuenta propia." });
    if (d.numPersonas != null)
      ctx.addIssue({ path: ["numPersonas"], code: "custom", message: "No aplica para cuenta propia." });
  } else {
    // taller o tienda: el nombre del negocio es obligatorio.
    if (!d.nombreNegocio)
      ctx.addIssue({ path: ["nombreNegocio"], code: "custom", message: "Requerido para taller o tienda." });
    // 'personas en el taller' solo aplica a talleres.
    if (d.tipoVendedor === "tienda" && d.numPersonas != null)
      ctx.addIssue({ path: ["numPersonas"], code: "custom", message: "Solo aplica para talleres." });
  }
});

export async function actualizarMiPerfil(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, artesanoId } = await requireVendedor();
  const parsed = perfilSchemaValidado.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // Foto opcional → bucket 'piezas' bajo vendedor/<artesanoId>/ (única ruta que la RLS
  // de storage 0008 le permite escribir).
  let fotoPath: string | null = null;
  let viejaFoto: string | null = null;
  let fotoUrl: string | null = parsed.data.foto_url ?? null; // hidden = la actual
  const file = formData.get("foto");
  if (file instanceof File && file.size > 0) {
    try {
      const up = await subirImagen(supabase, file, `vendedor/${artesanoId}`);
      fotoUrl = up.url;
      fotoPath = up.path;
    } catch (err) {
      return { message: err instanceof Error ? err.message : "Error de imagen." };
    }
    const { data: actual } = await supabase
      .from("artesanos")
      .select("foto_url")
      .eq("id", artesanoId)
      .maybeSingle();
    viejaFoto = (actual?.foto_url as string) ?? null;
  }

  const nombreCompleto = [d.nombres, d.apellidoP, d.apellidoM].filter(Boolean).join(" ");

  const { error } = await supabase
    .from("artesanos")
    .update({
      // El nombre display se mantiene en sync (el slug/URL NO cambia).
      nombre: nombreCompleto,
      nombres: d.nombres,
      apellido_paterno: d.apellidoP,
      apellido_materno: d.apellidoM ?? null,
      telefono: d.telefono ?? null,
      fecha_nacimiento: d.fechaNac ?? null,
      tipo_vendedor: d.tipoVendedor,
      nombre_negocio: d.tipoVendedor === "persona" ? null : d.nombreNegocio ?? null,
      num_personas: d.tipoVendedor === "taller" ? d.numPersonas ?? null : null,
      anios_experiencia: d.aniosExp ?? null,
      region: d.region ?? null,
      direccion: d.ciudad ? { ciudad: d.ciudad } : null,
      redes:
        d.instagram || d.sitio ? { instagram: d.instagram ?? null, sitio: d.sitio ?? null } : null,
      envia_nacional: d.enviaNacional,
      oficio: d.oficio ?? null,
      semblanza: d.semblanza ?? null,
      foto_url: fotoUrl,
    })
    .eq("id", artesanoId);

  if (error) {
    if (fotoPath) await borrarImagen(supabase, fotoPath);
    console.error("actualizarMiPerfil:", error.message);
    return { message: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }
  if (fotoPath && viejaFoto) await borrarImagen(supabase, viejaFoto);

  revalidatePath("/vendedor/perfil");
  revalidatePath("/vendedor");
  revalidatePath("/tienda");
  return { ok: true, message: "Tu perfil quedó actualizado." };
}
