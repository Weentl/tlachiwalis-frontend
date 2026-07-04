"use server";
import { requireVendedor } from "@/lib/vendedor/auth";
import { clienteIp, estaBloqueado, registrarFallo } from "@/lib/admin/rate-limit";
import { getMiProducto } from "@/lib/vendedor/productos";
import {
  crearWizard,
  editarAtributos,
  editarBasico,
  editarEnvio,
  editarGaleria,
  editarVariantes,
  publicar,
  despublicar,
  type WizardCtx,
} from "@/lib/producto-wizard";
import type { ActionState } from "@/lib/admin/types";

// Server Actions del WIZARD (VENDEDOR). Evolucionan crearMiProducto/actualizarMiProducto
// (form plano legado, intacto en ./actions.ts). Construyen un WizardCtx de vendedor:
//  - rol 'vendedor' → whitelist más estrecha (jamás fija clave_prod_serv/valor_declarado
//    crudos ni artesano_id del cliente; el ctx IMPONE artesano_id desde requireVendedor).
//  - carpeta 'vendedor/<artesanoId>' → única carpeta que la RLS de storage (0008) le permite.
//  - todas las queries se acotan por artesano_id (barrera anti-IDOR de la app).

async function ctxVendedor(): Promise<{ ctx: WizardCtx; artesanoId: string }> {
  const { supabase, artesanoId } = await requireVendedor();
  return {
    artesanoId,
    ctx: {
      supabase,
      rol: "vendedor",
      artesanoId, // FORZADO por el servidor (anti-IDOR); nunca del cliente
      carpeta: `vendedor/${artesanoId}`,
      revalidar: ["/vendedor/productos", "/tienda"],
      destino: "/vendedor/productos",
    },
  };
}

async function guardarRate(): Promise<ActionState | null> {
  const ip = await clienteIp();
  if (estaBloqueado(ip))
    return { message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  return null;
}

export async function crearMiProductoWizard(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rl = await guardarRate();
  if (rl) return rl;
  const { ctx } = await ctxVendedor();
  const res = await crearWizard(ctx, formData);
  if (!res.ok) registrarFallo(await clienteIp());
  return res;
}

export async function actualizarMiBasico(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx } = await ctxVendedor();
  return editarBasico(ctx, formData);
}

export async function actualizarMisAtributos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx } = await ctxVendedor();
  return editarAtributos(ctx, formData);
}

export async function guardarMisVariantes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx } = await ctxVendedor();
  return editarVariantes(ctx, formData);
}

export async function guardarMiGaleria(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx } = await ctxVendedor();
  const id = String(formData.get("id") ?? "");
  // getMiProducto ya verifica propiedad (anti-IDOR) antes de dar los datos del alt.
  const prod = id ? await getMiProducto(id) : null;
  const alt = prod
    ? { nombre: prod.nombre, oficio: prod.oficio, region: prod.region }
    : { nombre: "Pieza", oficio: "artesanía", region: "México" };
  return editarGaleria(ctx, formData, alt);
}

export async function actualizarMiEnvio(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx } = await ctxVendedor();
  return editarEnvio(ctx, formData);
}

export async function publicarMiProducto(
  formData: FormData,
): Promise<ActionState> {
  const { ctx } = await ctxVendedor();
  return publicar(ctx, formData);
}

export async function despublicarMiProducto(formData: FormData): Promise<void> {
  const { ctx } = await ctxVendedor();
  await despublicar(ctx, formData);
}
