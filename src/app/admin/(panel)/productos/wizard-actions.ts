"use server";
import { requireAdmin } from "@/lib/admin/auth";
import { clienteIp, estaBloqueado, registrarFallo } from "@/lib/admin/rate-limit";
import { getProductoAdmin } from "@/lib/admin/productos";
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

// Server Actions del WIZARD (ADMIN). Evolucionan crearProducto/actualizarProducto
// (que quedan intactos en ./actions.ts para el form plano legado). Todas construyen
// un WizardCtx de admin (rol 'admin', carpeta 'productos', ve todo el catálogo) y
// delegan al núcleo compartido lib/producto-wizard.ts.
//
// Rate limiting (CLAUDE.md §10): una Server Action es un POST público. Reusamos el
// bucket en memoria de lib/admin/rate-limit.ts en las acciones MUTANTES del wizard.

async function ctxAdmin(): Promise<WizardCtx> {
  const { supabase } = await requireAdmin();
  return {
    supabase,
    rol: "admin",
    artesanoId: null, // el admin elige artesano_id en el form (base schema)
    carpeta: "productos",
    revalidar: ["/admin/productos", "/tienda"],
    destino: "/admin/productos",
  };
}

async function guardarRate(): Promise<ActionState | null> {
  const ip = await clienteIp();
  if (estaBloqueado(ip))
    return { message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  return null;
}

export async function crearProductoWizard(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rl = await guardarRate();
  if (rl) return rl;
  const ctx = await ctxAdmin();
  const res = await crearWizard(ctx, formData);
  if (!res.ok) registrarFallo(await clienteIp());
  return res;
}

export async function actualizarBasico(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return editarBasico(await ctxAdmin(), formData);
}

export async function actualizarAtributos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return editarAtributos(await ctxAdmin(), formData);
}

export async function guardarVariantes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return editarVariantes(await ctxAdmin(), formData);
}

export async function guardarGaleria(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await ctxAdmin();
  const id = String(formData.get("id") ?? "");
  // alt-text autollenado necesita nombre/oficio/region de la pieza (autoridad de BD).
  const prod = id ? await getProductoAdmin(id) : null;
  const alt = prod
    ? { nombre: prod.nombre, oficio: prod.oficio, region: prod.region }
    : { nombre: "Pieza", oficio: "artesanía", region: "México" };
  return editarGaleria(ctx, formData, alt);
}

export async function actualizarEnvio(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return editarEnvio(await ctxAdmin(), formData);
}

export async function publicarProducto(
  formData: FormData,
): Promise<ActionState> {
  return publicar(await ctxAdmin(), formData);
}

export async function despublicarProducto(formData: FormData): Promise<void> {
  await despublicar(await ctxAdmin(), formData);
}
