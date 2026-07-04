import "server-only";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  atributosSchema,
  opcionesSchema,
  productoBaseSchema,
  stockSchema,
  type AtributoDef,
  type ProductoBaseInput,
} from "@/lib/admin/schemas";
import {
  atributosFormSchema,
  basicoSchema,
  envioSchema,
  galeriaMetaFormSchema,
  idsBorrarFormSchema,
  intentSchema,
  statusDeIntent,
  variantesFormSchema,
  type FilaVariante,
} from "@/lib/admin/wizard-schemas";
import { slugUnico } from "@/lib/admin/slug";
import { subirImagenProcesada, borrarImagen } from "@/lib/admin/storage";
import { procesarImagen } from "@/lib/imagenes/pipeline";
import {
  aDef,
  descriptivos,
  ejes,
  leerAtributosDeCategoria,
} from "@/lib/taxonomia-core";
import type { ActionState, AtributoDeCategoria } from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// NÚCLEO DEL WIZARD DE PRODUCTO (Fase 3) — cliente Supabase y contexto INYECTADOS.
// ════════════════════════════════════════════════════════════════════════════
// Admin y vendedor comparten TODA la lógica de escritura; solo cambia el contexto
// (WizardCtx): quién es dueño (artesano_id) y qué columnas puede tocar. La
// diferencia se encapsula en `ctx`, nunca en ramas dispersas.
//
// RIESGO CENTRAL (CLAUDE.md): PostgREST no da transacción entre varios INSERT.
// La opción "limpia" sería una RPC SECURITY DEFINER, pero crear una toca
// permisos/funciones y cae bajo el gate "preguntar antes de cambiar RLS/permisos"
// → NO se crea aquí. Se implementa COMPENSACIÓN: se escribe en orden
// (producto → variantes → inventario → imágenes) y ante CUALQUIER fallo se
// deshace lo ya escrito (borrar filas hijas + borrar el producto + borrar blobs
// subidos). No es tan fuerte como una transacción real (una caída del proceso
// entre pasos puede dejar restos), pero evita el caso común "producto sin
// variante / huérfanos" y deja el sistema consistente ante errores de la BD.

// ── Contexto por rol. artesano_id SIEMPRE lo fija el servidor (anti-IDOR). ──
export type WizardCtx = {
  supabase: SupabaseClient;
  // ADMIN: elige artesano y puede fijar clave_prod_serv/valor_declarado (SAT).
  // VENDEDOR: artesano_id forzado, sin overrides fiscales (whitelist más estrecha).
  rol: "admin" | "vendedor";
  // Dueño de la pieza. En vendedor lo impone requireVendedor(); en admin viene del form.
  artesanoId: string | null;
  // Carpeta de storage permitida por la RLS (0008). Admin: 'productos'. Vendedor: 'vendedor/<id>'.
  carpeta: "productos" | `vendedor/${string}`;
  // Rutas a revalidar tras escribir.
  revalidar: string[];
  // Prefijo de redirección tras crear/editar ('/admin/productos' | '/vendedor/productos').
  destino: string;
};

const n = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);

const CONFLICTO =
  "Alguien modificó esta pieza mientras la editabas. Recarga la página para ver la versión más reciente.";

// ── Mapeo de errores de trigger (autoridad de BD) a mensajes humanos ──────────
// Los triggers 0009 C.1/C.2 son la AUTORIDAD sobre atributos/opciones jsonb; zod es
// solo feedback previo. Si algo se cuela y el trigger rechaza, no exponemos el SQL.
function mensajeDeError(msg: string): string {
  if (/cobros_no_habilitados/i.test(msg)) return GATE_COBROS;
  if (/atributo|opci|eje de variaci|categoria_id/i.test(msg))
    return "Algún dato de la pieza no coincide con su categoría. Revisa los detalles y las opciones.";
  if (/más de 100 variantes/i.test(msg))
    return "Una pieza no puede tener más de 100 combinaciones.";
  if (/duplicate|unique|ya existe/i.test(msg))
    return "Hay una combinación o identificador repetido. Ajusta y vuelve a intentar.";
  return "No se pudo guardar la pieza. Revisa los datos e intenta de nuevo.";
}

// ── Gate de COBROS (Fase 5) ───────────────────────────────────────────────────
// Un vendedor no puede PUBLICAR hasta completar su conexión de cobros (Stripe Connect):
// sin cuenta lista no hay forma de recibir el pago. El trigger 0019 es el backstop real;
// esto solo da un mensaje amable antes. Para admin no aplica gate en app (el trigger igual
// respalda por si el artesano de la pieza no tiene cobros).
export const GATE_COBROS =
  "Para publicar necesitas completar tu conexión de cobros con Stripe (datos fiscales y bancarios). Mientras tanto puedes guardar la pieza en borrador.";

async function cobrosListos(ctx: WizardCtx): Promise<boolean> {
  if (ctx.rol !== "vendedor" || !ctx.artesanoId) return true;
  const { data } = await ctx.supabase
    .from("artesanos")
    .select("cobros_habilitados")
    .eq("id", ctx.artesanoId)
    .maybeSingle();
  return Boolean((data as { cobros_habilitados?: boolean } | null)?.cobros_habilitados);
}

// ── Autoridad de PRECIO y de SKU (nunca del cliente) ──────────────────────────
// precio_centavos = precio_pesos * 100. Los deltas de variante son 0 por defecto
// (el wizard no captura precios por variante en Fase 3). El SKU se autogenera de
// forma estable y única por producto a partir de las opciones normalizadas.
const skuDefault = (productoId: string) => `${productoId}-U`;

function skuDeOpciones(productoId: string, opciones: Record<string, string>): string {
  const claves = Object.keys(opciones).sort();
  if (claves.length === 0) return skuDefault(productoId);
  const sufijo = claves
    .map((k) => `${k}-${opciones[k]}`)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${productoId}-${sufijo || "v"}`;
}

// Clave canónica de una combinación (mismo criterio que opciones_norm de 0009):
// claves ordenadas → string estable, para reconciliar en EDITAR sin duplicar.
function claveNorm(opciones: Record<string, string>): string {
  return Object.keys(opciones)
    .sort()
    .map((k) => `${k}=${opciones[k]}`)
    .join("|");
}

// ── Whitelist de columnas de productos (anti-mass-assignment) ─────────────────
// La RLS NO restringe columnas; esta whitelist es la barrera. clave_prod_serv y
// valor_declarado_centavos son SOLO admin (override fiscal); el vendedor jamás los
// fija. artesano_id lo impone el ctx (server), nunca el cliente.
function toRowProducto(
  ctx: WizardCtx,
  d: ProductoBaseInput,
  status: "borrador" | "publicado",
  atributos: Record<string, string | number | boolean>,
) {
  const base: Record<string, unknown> = {
    artesano_id: ctx.rol === "vendedor" ? ctx.artesanoId : n(d.artesano_id),
    nombre: d.nombre,
    maker: n(d.maker),
    oficio: d.oficio,
    region: d.region,
    precio_centavos: d.precio_pesos * 100, // AUTORIDAD DE PRECIO
    descripcion: n(d.descripcion),
    tecnica: n(d.tecnica),
    materiales: n(d.materiales),
    medidas: n(d.medidas),
    status,
    categoria_id: n(d.categoria_id),
    atributos,
    tipo_producto: d.tipo_producto,
    peso_gramos: n(d.peso_gramos),
    largo_mm: n(d.largo_mm),
    ancho_mm: n(d.ancho_mm),
    alto_mm: n(d.alto_mm),
    valor_declarado_centavos: d.precio_pesos * 100, // default = precio base
  };
  // clave_prod_serv (override fiscal SAT) es SOLO admin y NO viene del base schema:
  // la action del admin lo añade a la fila por su cuenta (whitelist más estrecha del
  // vendedor = jamás lo fija). Aquí no se toca: si queda null hereda de la categoría.
  return base;
}

// ── Resolución del formulario dinámico + validación de atributos/opciones ─────
type Defs = {
  todas: AtributoDeCategoria[];
  descriptivosDef: AtributoDef[];
  ejesDef: AtributoDef[];
};

async function resolverDefs(
  supabase: SupabaseClient,
  categoriaId: number | null | undefined,
): Promise<Defs> {
  if (!categoriaId) return { todas: [], descriptivosDef: [], ejesDef: [] };
  const todas = await leerAtributosDeCategoria(supabase, categoriaId);
  return {
    todas,
    descriptivosDef: descriptivos(todas).map(aDef),
    ejesDef: ejes(todas).map(aDef),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CREAR (submit único del wizard): producto + variante(s) + inventario + imágenes
// ════════════════════════════════════════════════════════════════════════════
export async function crearWizard(
  ctx: WizardCtx,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = ctx;

  // 1) Intent primero (borrador/publicar) → deriva el `status`. El wizard NUNCA envía
  //    `status` como campo (usa `intent`), así que lo inyectamos aquí para que
  //    productoBaseSchema (que lo exige) valide. Sin esto, TODA creación fallaba con
  //    {status:["Required"]} en silencio.
  const intentP = intentSchema.safeParse(formData.get("intent"));
  if (!intentP.success) return { message: "Acción inválida." };
  const intent = intentP.data;
  const publicar = intent === "publicar";

  const raw = Object.fromEntries(formData);
  raw.status = statusDeIntent(intent); // borrador → 'borrador', publicar → 'publicado'
  const parsed = productoBaseSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // 2) Formulario dinámico de la categoría (autoridad: contra qué validar).
  const defs = await resolverDefs(supabase, d.categoria_id);

  // 3) Atributos descriptivos (jsonb). Requeridos SOLO al publicar.
  const atrRaw = atributosFormSchema.safeParse(formData.get("atributos"));
  if (!atrRaw.success)
    return { errors: { atributos: ["Datos de la pieza inválidos."] } };
  const atrParsed = atributosSchema(defs.descriptivosDef, publicar).safeParse(
    atrRaw.data,
  );
  if (!atrParsed.success)
    return { errors: atrParsed.error.flatten().fieldErrors };
  const atributos = atrParsed.data;

  // 4) Variantes (Paso 3). Validadas contra los EJES de la categoría.
  const filasRes = await parsearFilas(formData, defs.ejesDef, d.tipo_producto);
  if (!("filas" in filasRes)) return filasRes; // ActionState de error
  const filas = filasRes.filas;

  // 5) Gate de PUBLICAR (regla diferida de 0009 a Fase 3). La BD aún no la fuerza.
  const files = leerArchivosNuevos(formData);
  if (publicar) {
    const gate = gatePublicar(d, filas, files.length);
    if (gate) return gate;
    if (!(await cobrosListos(ctx))) return { message: GATE_COBROS };
  }

  // 6) Slug único server-side (el artesano nunca teclea el id).
  const id = await slugUnico(supabase, "productos", "id", d.nombre);
  const status = statusDeIntent(intent);

  // 7) Escritura con COMPENSACIÓN. Registramos lo escrito para poder deshacer.
  const blobs: string[] = []; // paths de storage subidos (para limpiar si algo falla)

  const rollback = async () => {
    // Borrar el producto en cascada limpia variantes/inventario/imagenes (FK cascade),
    // pero los BLOBS de storage no son FK: se borran aparte, best-effort.
    await supabase.from("productos").delete().eq("id", id);
    for (const p of blobs) await borrarImagen(supabase, p);
  };

  // 7a) Producto (el trigger C.1 valida atributos contra la categoría).
  {
    const { error } = await supabase
      .from("productos")
      .insert({ id, ...toRowProducto(ctx, d, status, atributos) });
    if (error) {
      console.error("crearWizard/producto:", error.message);
      if (error.message.includes("duplicate"))
        return { message: "Ya existe una pieza con un nombre muy parecido. Cambia el nombre." };
      return { message: mensajeDeError(error.message) };
    }
  }

  // 7b) Variante(s) + inventario. El trigger C.2 valida opciones; C.4 deriva agotado.
  {
    const res = await escribirVariantes(ctx, id, filas);
    if (res) {
      await rollback();
      return res;
    }
  }

  // 7c) Imágenes de galería (Paso 4). Sube blobs → filas producto_imagenes.
  {
    const res = await subirGaleriaNueva(ctx, id, d, files, blobs);
    if (res) {
      await rollback();
      return res;
    }
  }

  for (const p of ctx.revalidar) revalidarSeguro(p);
  return { ok: true, message: id };
}

// ── Parseo + validación de las filas de variante ──────────────────────────────
async function parsearFilas(
  formData: FormData,
  ejesDef: AtributoDef[],
  tipo: ProductoBaseInput["tipo_producto"],
): Promise<{ filas: FilaVariante[] } | ActionState> {
  const raw = variantesFormSchema.safeParse(formData.get("variantes"));
  if (!raw.success)
    return { errors: { variantes: ["Opciones de variante inválidas."] } };
  const filas = raw.data;

  // 'unico' / 'stock_simple': una sola fila con opciones={}. Si el cliente manda
  // ejes en esos tipos, se ignoran (la variante default siempre es {}).
  if (tipo !== "con_variantes") {
    const stockRaw = formData.get("stock");
    const stockP = stockSchema.safeParse(stockRaw ?? (tipo === "unico" ? 1 : 0));
    if (!stockP.success)
      return { errors: { stock: stockP.error.flatten().formErrors } };
    return { filas: [{ opciones: {}, stock: tipo === "unico" ? 1 : stockP.data }] };
  }

  if (filas.length === 0)
    return { errors: { variantes: ["Agrega al menos una combinación."] } };

  // Cada fila: opciones válidas contra los ejes de la categoría (trigger C.2 respalda).
  const vistas = new Set<string>();
  const validador = opcionesSchema(ejesDef);
  for (const f of filas) {
    const op = validador.safeParse(f.opciones);
    if (!op.success) return { errors: { variantes: ["Alguna opción no es válida para esta categoría."] } };
    const clave = claveNorm(f.opciones);
    if (vistas.has(clave))
      return { errors: { variantes: ["Hay combinaciones repetidas."] } };
    vistas.add(clave);
  }
  return { filas };
}

// ── Escribe variantes + su inventario 1:1 (SKU/delta server-side) ─────────────
async function escribirVariantes(
  ctx: WizardCtx,
  productoId: string,
  filas: FilaVariante[],
): Promise<ActionState | null> {
  const { supabase } = ctx;

  const varRows = filas.map((f) => ({
    producto_id: productoId,
    sku: skuDeOpciones(productoId, f.opciones), // AUTOGENERADO
    opciones: f.opciones,
    precio_delta_centavos: 0, // AUTORIDAD DE SERVIDOR (Fase 3 no captura deltas)
    activa: true,
  }));

  const { data: creadas, error } = await supabase
    .from("producto_variantes")
    .insert(varRows)
    .select("id,sku,opciones");
  if (error || !creadas) {
    console.error("escribirVariantes:", error?.message);
    return { message: mensajeDeError(error?.message ?? "") };
  }

  // Inventario 1:1 por variante creada, casando por SKU (estable).
  const stockPorSku = new Map(
    filas.map((f) => [skuDeOpciones(productoId, f.opciones), f.stock]),
  );
  const invRows = (creadas as { id: string; sku: string }[]).map((v) => ({
    variante_id: v.id,
    stock: stockPorSku.get(v.sku) ?? 0,
  }));
  const { error: invErr } = await supabase.from("inventario").insert(invRows);
  if (invErr) {
    console.error("escribirVariantes/inventario:", invErr.message);
    return { message: mensajeDeError(invErr.message) };
  }
  return null;
}

// ── Archivos nuevos del FormData (getAll('imagenes')) ─────────────────────────
function leerArchivosNuevos(formData: FormData): File[] {
  return formData
    .getAll("imagenes")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 9);
}

// ── Concurrencia acotada: procesar/subir N imágenes sin reventar RAM ──────────
// libvips decodifica en memoria; 9 decodificaciones simultáneas pican RAM en el
// host self-hosted. Se procesan de a LOTES de `limite`, preservando el índice
// (orden visual) para es_principal/orden. Si algún archivo lanza, se propaga.
const CONCURRENCIA = 3;

// ── Procesa un File por el pipeline y sube el WebP; devuelve la fila + path ────
// El pipeline corre ANTES de tocar Storage: si lanza, NO se subió nada de ese
// archivo (el rollback del caller borra solo los blobs ya confirmados).
async function procesarYSubir(
  ctx: WizardCtx,
  productoId: string,
  file: File,
  indice: number,
  alt: string,
  esPrincipal: boolean,
): Promise<{ path: string; row: Record<string, unknown> }> {
  const ab = await file.arrayBuffer();
  const proc = await procesarImagen(ab); // magic bytes + EXIF strip + HEIC + resize + q82
  const sub = await subirImagenProcesada(
    ctx.supabase,
    proc.buffer,
    ctx.carpeta,
    productoId,
  );
  return {
    path: sub.path,
    row: {
      producto_id: productoId,
      variante_id: null, // general (ligar a variante es opcional, se hace en EDITAR)
      storage_path: sub.path, // RELATIVO (0009), extensión .webp
      alt,
      orden: indice,
      es_principal: esPrincipal, // índice parcial 0009 respalda la portada única
      ancho: proc.ancho, // ANTES quedaban NULL; ahora los llena el pipeline
      alto: proc.alto,
      bytes: proc.bytes,
    },
  };
}

// ── Sube blobs (pipeline) y crea filas producto_imagenes; primera = portada ────
async function subirGaleriaNueva(
  ctx: WizardCtx,
  productoId: string,
  d: ProductoBaseInput,
  files: File[],
  blobs: string[],
): Promise<ActionState | null> {
  const { supabase } = ctx;
  if (files.length === 0) return null;

  const alt = altAuto(d);
  const rows: Array<Record<string, unknown> & { orden: number }> = [];

  // Procesar/subir en lotes acotados. Cada blob subido se registra en `blobs`
  // apenas se confirma, para que el rollback del caller lo pueda limpiar.
  for (let base = 0; base < files.length; base += CONCURRENCIA) {
    const lote = files.slice(base, base + CONCURRENCIA);
    try {
      const res = await Promise.all(
        lote.map((file, k) => {
          const i = base + k;
          return procesarYSubir(ctx, productoId, file, i, alt, i === 0);
        }),
      );
      for (const r of res) {
        blobs.push(r.path);
        rows.push(r.row as Record<string, unknown> & { orden: number });
      }
    } catch (e) {
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
  }

  const { error } = await supabase.from("producto_imagenes").insert(rows);
  if (error) {
    console.error("subirGaleriaNueva:", error.message);
    return { message: mensajeDeError(error.message) };
  }
  return null;
}

// alt-text autollenado: '<nombre>, <oficio> de <region>' (mismo criterio que 0009 E.5).
function altAuto(d: ProductoBaseInput): string {
  return `${d.nombre}, ${d.oficio} de ${d.region}`;
}

// ── Gate de PUBLICAR (0009 difirió la regla a Fase 3) ─────────────────────────
function gatePublicar(
  d: ProductoBaseInput,
  filas: FilaVariante[],
  numImagenes: number,
): ActionState | null {
  if (!d.categoria_id)
    return { message: "Para publicar, elige una categoría." };
  if (numImagenes < 1)
    return { message: "Para publicar, sube al menos una foto." };
  const stockTotal = filas.reduce((s, f) => s + f.stock, 0);
  if (stockTotal <= 0)
    return { message: "Para publicar, indica cuántas piezas tienes (stock mayor a 0)." };
  return null;
}

// revalidatePath solo es válido dentro de un request de Next; en un Server Action
// siempre lo está. El try/catch es defensa por si el núcleo se ejerciera en tests.
function revalidarSeguro(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // revalidatePath fuera de un request de Next lanzaría; en un action nunca pasa.
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EDITAR — updates PARCIALES por pestaña con optimistic lock (updated_at)
// ════════════════════════════════════════════════════════════════════════════

// Update con lock optimista. Devuelve ActionState (error) o null (ok).
async function updateConLock(
  ctx: WizardCtx,
  id: string,
  lockTs: string,
  row: Record<string, unknown>,
): Promise<ActionState | null> {
  const { supabase } = ctx;
  let q = supabase.from("productos").update(row).eq("id", id);
  if (ctx.rol === "vendedor" && ctx.artesanoId)
    q = q.eq("artesano_id", ctx.artesanoId); // barrera anti-IDOR de la app
  if (lockTs) q = q.eq("updated_at", lockTs);
  const { data: upd, error } = await q.select("id");
  if (error) {
    console.error("updateConLock:", error.message);
    return { message: mensajeDeError(error.message) };
  }
  if (!upd || upd.length === 0) {
    // Distinguir "conflicto de lock" de "no existe / no es tuyo".
    let existeQ = supabase.from("productos").select("id").eq("id", id);
    if (ctx.rol === "vendedor" && ctx.artesanoId)
      existeQ = existeQ.eq("artesano_id", ctx.artesanoId);
    const { data: existe } = await existeQ.maybeSingle();
    return { message: existe ? CONFLICTO : "La pieza ya no existe o no es tuya." };
  }
  return null;
}

// ── Verifica propiedad de un producto (para editar sus hijos: variantes/imágenes) ──
async function esMio(ctx: WizardCtx, productoId: string): Promise<boolean> {
  const { supabase } = ctx;
  let q = supabase.from("productos").select("id").eq("id", productoId);
  if (ctx.rol === "vendedor" && ctx.artesanoId)
    q = q.eq("artesano_id", ctx.artesanoId);
  const { data } = await q.maybeSingle();
  return !!data;
}

// ── EDITAR: Básico (nombre/categoria/precio/descripcion) ──────────────────────
export async function editarBasico(
  ctx: WizardCtx,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const lockTs = String(formData.get("updated_at") ?? "");
  if (!id) return { message: "Falta el identificador." };

  const parsed = basicoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const row: Record<string, unknown> = {
    nombre: d.nombre,
    categoria_id: n(d.categoria_id),
    precio_centavos: d.precio_pesos * 100, // AUTORIDAD DE PRECIO
    descripcion: n(d.descripcion),
  };
  const err = await updateConLock(ctx, id, lockTs, row);
  if (err) return err;
  for (const p of ctx.revalidar) revalidarSeguro(p);
  return { ok: true };
}

// ── EDITAR: Atributos (productos.atributos jsonb; trigger C.1 es autoridad) ────
export async function editarAtributos(
  ctx: WizardCtx,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = ctx;
  const id = String(formData.get("id") ?? "");
  const lockTs = String(formData.get("updated_at") ?? "");
  if (!id) return { message: "Falta el identificador." };

  // La categoría vigente decide contra qué validar. La leemos de la BD (autoridad),
  // no del cliente (que podría mentir para colar atributos de otra categoría).
  let catQ = supabase.from("productos").select("categoria_id").eq("id", id);
  if (ctx.rol === "vendedor" && ctx.artesanoId)
    catQ = catQ.eq("artesano_id", ctx.artesanoId);
  const { data: prod } = await catQ.maybeSingle();
  if (!prod) return { message: "La pieza ya no existe o no es tuya." };

  const defs = await resolverDefs(supabase, (prod as { categoria_id: number | null }).categoria_id);
  const atrRaw = atributosFormSchema.safeParse(formData.get("atributos"));
  if (!atrRaw.success) return { errors: { atributos: ["Datos inválidos."] } };
  const atrParsed = atributosSchema(defs.descriptivosDef, false).safeParse(atrRaw.data);
  if (!atrParsed.success) return { errors: atrParsed.error.flatten().fieldErrors };

  const err = await updateConLock(ctx, id, lockTs, { atributos: atrParsed.data });
  if (err) return err;
  for (const p of ctx.revalidar) revalidarSeguro(p);
  return { ok: true };
}

// ── EDITAR: Envío (dimensiones de empaque) ────────────────────────────────────
export async function editarEnvio(
  ctx: WizardCtx,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const lockTs = String(formData.get("updated_at") ?? "");
  if (!id) return { message: "Falta el identificador." };

  const parsed = envioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  // NOTA: `fragil` no tiene columna en 0009; se ignora en la escritura (UI-only por ahora).
  const row: Record<string, unknown> = {
    peso_gramos: n(d.peso_gramos),
    largo_mm: n(d.largo_mm),
    ancho_mm: n(d.ancho_mm),
    alto_mm: n(d.alto_mm),
  };
  const err = await updateConLock(ctx, id, lockTs, row);
  if (err) return err;
  for (const p of ctx.revalidar) revalidarSeguro(p);
  return { ok: true };
}

// ── EDITAR: Variantes + inventario (reconciliación por opciones normalizadas) ──
export async function editarVariantes(
  ctx: WizardCtx,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = ctx;
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Falta el identificador." };
  if (!(await esMio(ctx, id)))
    return { message: "La pieza ya no existe o no es tuya." };

  // Categoría vigente para validar los ejes (autoridad de BD).
  const { data: prod } = await supabase
    .from("productos")
    .select("categoria_id,tipo_producto")
    .eq("id", id)
    .maybeSingle();
  if (!prod) return { message: "La pieza ya no existe." };
  const p = prod as { categoria_id: number | null; tipo_producto: ProductoBaseInput["tipo_producto"] };
  const defs = await resolverDefs(supabase, p.categoria_id);

  const raw = variantesFormSchema.safeParse(formData.get("variantes"));
  if (!raw.success) return { errors: { variantes: ["Opciones inválidas."] } };
  const filas = raw.data;
  // Guard anti-pérdida: todo producto tiene ≥1 variante. Sin esto, un `variantes: []`
  // (o deseleccionar todo) borraría TODAS las combinaciones + su inventario.
  if (filas.length === 0)
    return { errors: { variantes: ["Debe quedar al menos una opción con inventario."] } };

  // Valida cada fila contra los ejes; detecta duplicados por clave normalizada.
  const validador = opcionesSchema(defs.ejesDef);
  const vistas = new Set<string>();
  for (const f of filas) {
    if (!validador.safeParse(f.opciones).success)
      return { errors: { variantes: ["Alguna opción no es válida para la categoría."] } };
    const clave = claveNorm(f.opciones);
    if (vistas.has(clave))
      return { errors: { variantes: ["Hay combinaciones repetidas."] } };
    vistas.add(clave);
  }

  // Lee las variantes actuales (con inventario) para reconciliar.
  const { data: actuales, error: exErr } = await supabase
    .from("producto_variantes")
    .select("id,sku,opciones")
    .eq("producto_id", id);
  if (exErr) return { message: mensajeDeError(exErr.message) };

  const actualPorClave = new Map(
    ((actuales ?? []) as { id: string; opciones: Record<string, string> }[]).map(
      (v) => [claveNorm(v.opciones), v],
    ),
  );
  const deseadasClaves = new Set(filas.map((f) => claveNorm(f.opciones)));

  // 1) UPSERT: crear las nuevas, actualizar stock de las existentes.
  for (const f of filas) {
    const clave = claveNorm(f.opciones);
    const existente = actualPorClave.get(clave);
    if (existente) {
      const { error } = await supabase
        .from("inventario")
        .update({ stock: f.stock })
        .eq("variante_id", existente.id);
      if (error) return { message: mensajeDeError(error.message) };
    } else {
      const sku = skuDeOpciones(id, f.opciones);
      const { data: nueva, error } = await supabase
        .from("producto_variantes")
        .insert({ producto_id: id, sku, opciones: f.opciones, precio_delta_centavos: 0, activa: true })
        .select("id")
        .maybeSingle();
      if (error || !nueva) return { message: mensajeDeError(error?.message ?? "") };
      const { error: invErr } = await supabase
        .from("inventario")
        .insert({ variante_id: (nueva as { id: string }).id, stock: f.stock });
      if (invErr) return { message: mensajeDeError(invErr.message) };
    }
  }
  // 2) BORRAR las que ya no están (cascade limpia su inventario). Nunca borrar la
  //    default {} si el producto no es con_variantes.
  for (const [clave, v] of actualPorClave) {
    // Nunca borrar la variante default (opciones {}, claveNorm === "") de una pieza que
    // NO es con_variantes: es su inventario base.
    if (clave === "" && p.tipo_producto !== "con_variantes") continue;
    if (!deseadasClaves.has(clave)) {
      await supabase.from("producto_variantes").delete().eq("id", v.id).eq("producto_id", id);
    }
  }

  for (const rp of ctx.revalidar) revalidarSeguro(rp);
  return { ok: true };
}

// ── EDITAR: Galería (insertar/borrar/reordenar, portada, imagen_variante_id) ──
export async function editarGaleria(
  ctx: WizardCtx,
  formData: FormData,
  altData: { nombre: string; oficio: string; region: string },
): Promise<ActionState> {
  const { supabase } = ctx;
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Falta el identificador." };
  if (!(await esMio(ctx, id)))
    return { message: "La pieza ya no existe o no es tuya." };

  // IDs a borrar (validar que sean del MISMO producto: anti-IDOR).
  const borrarP = idsBorrarFormSchema.safeParse(formData.get("borrar"));
  if (!borrarP.success) return { message: "Datos de galería inválidos." };

  // Metadatos de reorden/portada/variante de las imágenes existentes.
  const metaP = galeriaMetaFormSchema.safeParse(formData.get("meta"));
  if (!metaP.success) return { errors: { meta: ["Orden de galería inválido."] } };

  // Cuáles filas son de ESTE producto (barrera anti-IDOR sobre la RLS).
  const { data: existentes } = await supabase
    .from("producto_imagenes")
    .select("id,storage_path")
    .eq("producto_id", id);
  const idsProducto = new Set(
    ((existentes ?? []) as { id: string }[]).map((r) => r.id),
  );
  const pathPorId = new Map(
    ((existentes ?? []) as { id: string; storage_path: string }[]).map((r) => [
      r.id,
      r.storage_path,
    ]),
  );

  // Variantes del producto (para validar imagen→variante del MISMO producto).
  const { data: vars } = await supabase
    .from("producto_variantes")
    .select("id")
    .eq("producto_id", id);
  const idsVariante = new Set(((vars ?? []) as { id: string }[]).map((v) => v.id));

  // 1) BORRAR (solo IDs de este producto; ignora ajenos silenciosamente).
  const aBorrar = borrarP.data.filter((x) => idsProducto.has(x));
  if (aBorrar.length > 0) {
    const { error } = await supabase
      .from("producto_imagenes")
      .delete()
      .in("id", aBorrar)
      .eq("producto_id", id);
    if (!error) {
      for (const bid of aBorrar) await borrarImagen(supabase, pathPorId.get(bid) ?? null);
    }
  }

  // 2) SUBIR nuevas (respetando el tope de 9 tras los borrados). Cada File pasa
  //    por el pipeline (magic bytes + EXIF strip + HEIC + resize + WebP q82) y
  //    ancho/alto/bytes se pueblan del resultado (antes quedaban NULL).
  const files = leerArchivosNuevos(formData);
  const restantes = idsProducto.size - aBorrar.length;
  const cupo = Math.max(0, 9 - restantes);
  const blobs: string[] = [];
  const alt = `${altData.nombre}, ${altData.oficio} de ${altData.region}`;
  const aSubir = files.slice(0, Math.max(0, cupo));
  for (let i = 0; i < aSubir.length; i++) {
    let proc, sub;
    try {
      const ab = await aSubir[i].arrayBuffer();
      proc = await procesarImagen(ab); // corre ANTES de tocar Storage
      sub = await subirImagenProcesada(supabase, proc.buffer, ctx.carpeta, id);
    } catch (e) {
      for (const b of blobs) await borrarImagen(supabase, b);
      return { message: e instanceof Error ? e.message : "Error de imagen." };
    }
    blobs.push(sub.path);
    const { error } = await supabase.from("producto_imagenes").insert({
      producto_id: id,
      variante_id: null,
      storage_path: sub.path, // RELATIVO, extensión .webp
      alt,
      orden: restantes + i,
      es_principal: restantes === 0 && i === 0,
      ancho: proc.ancho,
      alto: proc.alto,
      bytes: proc.bytes,
    });
    if (error) {
      await borrarImagen(supabase, sub.path);
      return { message: mensajeDeError(error.message) };
    }
  }

  // 3) REORDENAR + portada + imagen↔variante (solo filas de este producto).
  for (const m of metaP.data) {
    if (!idsProducto.has(m.id)) continue; // anti-IDOR
    if (m.variante_id && !idsVariante.has(m.variante_id))
      return { message: "Una foto quedó ligada a una variante que no es de esta pieza." };
    const { error } = await supabase
      .from("producto_imagenes")
      .update({
        orden: m.orden,
        es_principal: m.es_principal,
        variante_id: m.variante_id ?? null,
      })
      .eq("id", m.id)
      .eq("producto_id", id); // barrera anti-IDOR
    if (error) return { message: mensajeDeError(error.message) };
  }

  for (const rp of ctx.revalidar) revalidarSeguro(rp);
  return { ok: true };
}

// ── PUBLICAR / DESPUBLICAR (cambio de status con gate en publicar) ────────────
export async function publicar(
  ctx: WizardCtx,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = ctx;
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Falta el identificador." };

  // Reúne el estado real de la pieza para el gate (categoría + imágenes + stock).
  let q = supabase
    .from("productos")
    .select("categoria_id,status")
    .eq("id", id);
  if (ctx.rol === "vendedor" && ctx.artesanoId)
    q = q.eq("artesano_id", ctx.artesanoId);
  const { data: prod } = await q.maybeSingle();
  if (!prod) return { message: "La pieza ya no existe o no es tuya." };
  const p = prod as { categoria_id: number | null; status: string };

  // Gate de cobros primero: es el bloqueo duro (sin cuenta lista no hay venta posible).
  if (!(await cobrosListos(ctx))) return { message: GATE_COBROS };

  if (!p.categoria_id) return { message: "Para publicar, elige una categoría." };

  const { count: nImg } = await supabase
    .from("producto_imagenes")
    .select("id", { count: "exact", head: true })
    .eq("producto_id", id);
  if ((nImg ?? 0) < 1) return { message: "Para publicar, sube al menos una foto." };

  // Stock total sobre variantes activas (misma idea que el trigger C.4).
  const { data: invs } = await supabase
    .from("producto_variantes")
    .select("id,activa,inventario(stock)")
    .eq("producto_id", id);
  const stockTotal = ((invs ?? []) as Array<{
    activa: boolean;
    inventario: { stock: number } | { stock: number }[] | null;
  }>)
    .filter((v) => v.activa)
    .reduce((s, v) => {
      const inv = Array.isArray(v.inventario) ? v.inventario[0] : v.inventario;
      return s + (inv?.stock ?? 0);
    }, 0);
  if (stockTotal <= 0)
    return { message: "Para publicar, indica cuántas piezas tienes (stock mayor a 0)." };

  // Requeridos de atributos: valida el jsonb ACTUAL contra la categoría.
  const { data: full } = await supabase
    .from("productos")
    .select("atributos")
    .eq("id", id)
    .maybeSingle();
  const defs = await resolverDefs(supabase, p.categoria_id);
  const atrParsed = atributosSchema(defs.descriptivosDef, true).safeParse(
    (full as { atributos: Record<string, unknown> } | null)?.atributos ?? {},
  );
  if (!atrParsed.success)
    return { message: "Faltan datos obligatorios de la pieza para publicar. Complétalos en Detalles." };

  // status → 'publicado'. NO tocar 'agotado' (lo maneja el trigger C.4).
  const err = await updateConLock(ctx, id, "", { status: "publicado" });
  if (err) return err;
  for (const rp of ctx.revalidar) revalidarSeguro(rp);
  return { ok: true };
}

export async function despublicar(
  ctx: WizardCtx,
  formData: FormData,
): Promise<void> {
  const { supabase } = ctx;
  const id = String(formData.get("id") ?? "");
  if (id) {
    let q = supabase.from("productos").update({ status: "borrador" }).eq("id", id);
    if (ctx.rol === "vendedor" && ctx.artesanoId)
      q = q.eq("artesano_id", ctx.artesanoId);
    await q;
    for (const rp of ctx.revalidar) revalidarSeguro(rp);
  }
}
