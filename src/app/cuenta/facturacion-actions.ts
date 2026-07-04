"use server";
import { z } from "zod";
import { requireComprador } from "@/lib/comprador/auth";
import type { PerfilFacturacion } from "@/lib/comprador/facturacion";

const facturacionSchema = z.object({
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-ZÑ&0-9]{12,13}$/, "RFC inválido (12–13 caracteres)."),
  razonSocial: z.string().trim().max(200).optional().default(""),
  regimenFiscal: z.string().trim().max(10).optional().default(""),
  usoCfdi: z.string().trim().max(10).optional().default(""),
  cpFiscal: z.string().trim().max(10).optional().default(""),
  email: z.union([z.string().trim().email().max(160), z.literal("")]).optional().default(""),
});

// Guarda/actualiza el perfil fiscal del comprador (upsert, RLS self). Reusable entre compras.
export async function guardarFacturacion(
  perfil: PerfilFacturacion,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = facturacionSchema.safeParse(perfil);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos de facturación inválidos.";
    return { ok: false, error: first };
  }
  const { supabase, user } = await requireComprador();
  const d = parsed.data;
  const { error } = await supabase.from("facturacion_perfiles").upsert(
    {
      user_id: user.id, // forzado por el servidor (anti-IDOR); RLS with_check lo exige
      rfc: d.rfc,
      razon_social: d.razonSocial || null,
      regimen_fiscal: d.regimenFiscal || null,
      uso_cfdi: d.usoCfdi || null,
      cp_fiscal: d.cpFiscal || null,
      email: d.email || null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: "No se pudieron guardar tus datos de facturación." };
  return { ok: true };
}
