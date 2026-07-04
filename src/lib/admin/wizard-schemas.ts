import { z } from "zod";
import { atributosJsonbSchema, opcionesJsonbSchema, stockSchema } from "./schemas";

// ════════════════════════════════════════════════════════════════════════════
// SCHEMAS DEL WIZARD (Fase 3). NO reemplazan schemas.ts: lo EXTIENDEN.
// ════════════════════════════════════════════════════════════════════════════
// El wizard reutiliza productoBaseSchema/atributosSchema/opcionesSchema/stockSchema
// de schemas.ts (autoridad de forma y de precio). Aquí solo se define:
//  - el INTENT (guardar borrador vs publicar), que decide si se exigen requeridos.
//  - el parseo de los CAMPOS COMPUESTOS que el cliente manda como JSON en FormData
//    (atributos, filas de variantes, orden/portada de galería). El servidor NUNCA
//    confía en montos ni SKUs del cliente: aquí solo entra la FORMA; el precio
//    (precio_centavos) y el delta/SKU se calculan en el Server Action.

// ── Intent ──────────────────────────────────────────────────────────────────
// 'borrador' NO exige requeridos ni imágenes (auto-guardado / trabajo en progreso).
// 'publicar' exige categoria + requeridos + >=1 imagen + stock>0 (regla diferida de
// 0009 a Fase 3; la BD aún no la fuerza, el Server Action es la autoridad).
export const intentSchema = z.enum(["borrador", "publicar"]);
export type WizardIntent = z.infer<typeof intentSchema>;

// Traduce el intent a la columna status de productos (whitelist; el cliente NUNCA
// escribe status como palabra libre — solo elige uno de los dos botones).
export function statusDeIntent(intent: WizardIntent): "borrador" | "publicado" {
  return intent === "publicar" ? "publicado" : "borrador";
}

// ── Parseo seguro de JSON embebido en FormData ────────────────────────────────
// El cliente serializa objetos/arreglos a string (FormData solo lleva strings/File).
// Un JSON inválido NO debe tumbar la acción con un throw: se convierte en error de
// validación de zod con mensaje humano.
function jsonPreprocess(fallback: unknown) {
  return (v: unknown) => {
    if (v === undefined || v === null || v === "") return fallback;
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return Symbol.for("json-invalido"); // fuerza el fallo del schema destino
    }
  };
}

/** productos.atributos (jsonb descriptivo) recibido como string JSON. */
export const atributosFormSchema = z.preprocess(
  jsonPreprocess({}),
  atributosJsonbSchema,
);

// ── Filas de variantes (Paso 3 "Sí") ─────────────────────────────────────────
// Cada fila = una COMBINACIÓN de ejes + su stock. El cliente NUNCA manda sku ni
// precio_delta_centavos (autoridad de servidor: el SKU se autogenera y el delta es
// 0 por defecto, recalculado server-side). Solo `opciones` (forma) + `stock`.
export const filaVarianteSchema = z.object({
  opciones: opcionesJsonbSchema,
  stock: stockSchema,
  // opcional: id de la imagen de portada de ESTA variante (validado anti-IDOR en el
  // Server Action: debe ser una imagen del MISMO producto).
  imagen_variante_id: z.string().uuid().optional(),
});
export type FilaVariante = z.infer<typeof filaVarianteSchema>;

/** Lista de filas de variantes recibida como string JSON. Máx 100 (trigger 0009 C.2). */
export const variantesFormSchema = z.preprocess(
  jsonPreprocess([]),
  z
    .array(filaVarianteSchema)
    .max(100, "Un producto no puede tener más de 100 variantes"),
);

// ── Galería (Paso 4) ──────────────────────────────────────────────────────────
// El orden y la portada se mandan como metadatos; los archivos van aparte en el
// FormData (getAll('imagenes')). storage_path se genera server-side (subirImagen);
// el cliente jamás lo fija. alt se autollena en servidor si viene vacío.
export const MAX_GALERIA = 9;

// Metadatos de UNA imagen ya existente que se reordena/marca portada (EDITAR).
export const metaImagenSchema = z.object({
  id: z.string().uuid(),
  orden: z.coerce.number().int().nonnegative().max(MAX_GALERIA),
  es_principal: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean(),
  ),
  // Foto ligada a una variante (NULL = general). Validado anti-IDOR en el Server Action.
  variante_id: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().uuid().optional(),
  ),
});
export type MetaImagen = z.infer<typeof metaImagenSchema>;

/** Orden/portada de la galería recibido como string JSON (reordenar en EDITAR). */
export const galeriaMetaFormSchema = z.preprocess(
  jsonPreprocess([]),
  z.array(metaImagenSchema).max(MAX_GALERIA, "Hasta 9 fotos por pieza"),
);

// ── IDs de imágenes a BORRAR (EDITAR galería) ────────────────────────────────
export const idsBorrarFormSchema = z.preprocess(
  jsonPreprocess([]),
  z.array(z.string().uuid()).max(MAX_GALERIA),
);

// ── EDITAR: campos parciales por pestaña (acceso aleatorio) ───────────────────
// Cada pestaña guarda con su propio Server Action de update parcial + optimistic
// lock por updated_at. El precio SIEMPRE entra como PESOS (autoridad de servidor).
export const basicoSchema = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre a tu pieza"),
  categoria_id: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce
      .number({ message: "Elige una categoría" })
      .int()
      .positive()
      .optional(),
  ),
  precio_pesos: z.coerce
    .number({ message: "Precio inválido" })
    .int("Usa pesos enteros")
    .positive("Debe ser mayor a 0")
    .max(1_000_000, "Máximo $1,000,000"),
  descripcion: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional(),
  ),
});
export type BasicoInput = z.infer<typeof basicoSchema>;

// Envío (Paso 4 / pestaña Envío): dimensiones de EMPAQUE, opcionales.
const enteroEmpaque = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce
    .number({ message: "Debe ser un número" })
    .int("Usa un entero")
    .nonnegative("No puede ser negativo")
    .max(2_000_000, "Fuera de rango")
    .optional(),
);

export const envioSchema = z.object({
  peso_gramos: enteroEmpaque,
  largo_mm: enteroEmpaque,
  ancho_mm: enteroEmpaque,
  alto_mm: enteroEmpaque,
  fragil: z.preprocess(
    (v) => v === true || v === "true" || v === "on",
    z.boolean().optional(),
  ),
});
export type EnvioInput = z.infer<typeof envioSchema>;
