"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { mensajeErrorPedido } from "@/lib/pedidos/estados";

const schema = z.object({
  id: z.string().uuid(),
  estado: z.enum(["validado", "enviado", "entregado", "cancelado"]),
  paqueteria: z.string().trim().max(80).optional(),
  guia: z.string().trim().max(80).optional(),
  guiaUrl: z.union([z.string().trim().url().max(300), z.literal("")]).optional(),
  nota: z.string().trim().max(300).optional(),
});

export type ResultadoPedido = { ok: true } | { ok: false; error: string };

// Supervisión: el admin puede avanzar/cancelar cualquier envío. La authz (is_admin) + la máquina de
// estados están en la RPC avanzar_fulfillment; requireAdmin es defensa en profundidad.
export async function avanzarPedidoAdmin(input: z.input<typeof schema>): Promise<ResultadoPedido> {
  const { supabase } = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const d = parsed.data;
  const { error } = await supabase.rpc("avanzar_fulfillment", {
    p_id: d.id,
    p_estado: d.estado,
    p_paqueteria: d.paqueteria || null,
    p_guia: d.guia || null,
    p_guia_url: d.guiaUrl || null,
    p_nota: d.nota || null,
  });
  if (error) return { ok: false, error: mensajeErrorPedido(error.message) };
  revalidatePath("/admin/pedidos");
  return { ok: true };
}
