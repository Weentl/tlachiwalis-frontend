import { z } from "zod";
import { REGIMEN_CODES, ESTADOS_MX, OFICIOS, clabeValida } from "./catalogos";

// "" o whitespace → undefined (→ NULL en la BD).
const emptyToUndef = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s == null ? undefined : s;
};
const optText = z.preprocess(emptyToUndef, z.string().optional());
const incluye = (xs: readonly string[], v: string) => xs.includes(v);

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones");

// Catálogo opcional (artesano): vacío permitido, si viene debe estar en la lista.
const opcionalEnCatalogo = (xs: readonly string[], msg: string) =>
  z.preprocess(
    emptyToUndef,
    z
      .string()
      .optional()
      .refine((v) => v === undefined || incluye(xs, v), msg),
  );

// Catálogo requerido (producto).
const requeridoEnCatalogo = (xs: readonly string[], msg: string) =>
  z.preprocess(
    emptyToUndef,
    z
      .string({ required_error: "Requerido", invalid_type_error: "Requerido" })
      .refine((v) => incluye(xs, v), msg),
  );

// RFC: normaliza (mayúsculas, sin espacios/puntos/guiones) y valida persona
// física (13) o moral (12). El homoclave puede tener letras o dígitos.
const rfc = z.preprocess(
  (v) => {
    const s = emptyToUndef(v);
    return typeof s === "string" ? s.toUpperCase().replace(/[\s.\-]/g, "") : s;
  },
  z
    .string()
    .regex(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/, "RFC inválido (12 o 13 caracteres)")
    .optional(),
);

// CLABE: normaliza (sin espacios/guiones) y valida 18 dígitos + dígito verificador.
const clabe = z.preprocess(
  (v) => {
    const s = emptyToUndef(v);
    return typeof s === "string" ? s.replace(/[\s-]/g, "") : s;
  },
  z
    .string()
    .refine(clabeValida, "CLABE inválida: 18 dígitos con dígito verificador correcto")
    .optional(),
);

// ============================ ARTESANO ============================
// slug NO se pide al artesano: se autogenera del nombre en el servidor (ver
// slug.ts). En edición es inmutable (no se toca para no romper URLs).
export const artesanoSchema = z.object({
  nombre: z.string().trim().min(1, "Requerido"),
  taller: optText,     // nombre del taller/comercio (marca pública)
  contacto: optText,   // correo o WhatsApp — referencia del admin para invitar
  semblanza: optText,
  region: opcionalEnCatalogo(ESTADOS_MX, "Estado inválido"),
  oficio: opcionalEnCatalogo(OFICIOS, "Oficio inválido"),
  foto_url: optText,
  rfc,
  regimen_fiscal: z.preprocess(
    emptyToUndef,
    z
      .string()
      .optional()
      .refine((v) => v === undefined || incluye(REGIMEN_CODES, v), "Régimen inválido"),
  ),
  clabe,
  // status NO se edita en el form: create=pausado (nace inactivo); la edición va por
  // "Acceso y seguridad" (suspender/reactivar). Fiscales → Stripe (Fase 6).
  status: z.enum(["activo", "pausado"]).optional(),
});

// ============================ PRODUCTO ============================
// tipo_producto: whitelist (espejo del CHECK productos_tipo_producto_check de 0009).
export const tipoProductoSchema = z.enum(["unico", "stock_simple", "con_variantes"]);

// categoria_id: viene como string del <select>; se coacciona a entero >= 1. La
// validación de que EXISTE en el catálogo la hace el trigger/FK en BD (0009); aquí
// solo garantizamos la forma. Optional (NULL en borrador; NOT NULL al publicar en BD).
const categoriaId = z.preprocess(
  emptyToUndef,
  z.coerce
    .number({ message: "Categoría inválida" })
    .int("Categoría inválida")
    .positive("Categoría inválida")
    .optional(),
);

// Entero de empaque para envío (gramos / milímetros): opcional, entero >= 0.
const enteroEmpaque = z.preprocess(
  emptyToUndef,
  z.coerce
    .number({ message: "Debe ser un número" })
    .int("Usa un entero")
    .nonnegative("No puede ser negativo")
    .max(2_000_000, "Fuera de rango")
    .optional(),
);

export const productoBaseSchema = z.object({
  artesano_id: z.preprocess(
    emptyToUndef,
    z.string().uuid("Artesano inválido").optional(),
  ),
  nombre: z.string().trim().min(1, "Requerido"),
  maker: optText,
  oficio: requeridoEnCatalogo(OFICIOS, "Oficio inválido"),
  region: requeridoEnCatalogo(ESTADOS_MX, "Estado inválido"),
  // El cliente envía PESOS; el servidor calcula centavos (autoridad de precio).
  precio_pesos: z.coerce
    .number({ message: "Precio inválido" })
    .int("Usa pesos enteros")
    .positive("Debe ser mayor a 0")
    .max(1000000, "Máximo $1,000,000"),
  descripcion: optText,
  tecnica: optText,
  materiales: optText,
  medidas: optText, // LEGADO: texto libre de medidas para el comprador.
  status: z.enum(["borrador", "publicado", "agotado"]),
  // ── Modelo de producto (0009). TODOS opcionales: los forms actuales no los envían
  //    y deben seguir validando sin cambios (Fase 3 los cablea). tipo_producto default
  //    'unico' para reflejar el default de BD. clave_prod_serv NO va aquí: es override
  //    SOLO admin (whitelist en el Server Action del admin), nunca del form del vendedor.
  categoria_id: categoriaId,
  tipo_producto: tipoProductoSchema.optional().default("unico"),
  peso_gramos: enteroEmpaque,
  largo_mm: enteroEmpaque,
  ancho_mm: enteroEmpaque,
  alto_mm: enteroEmpaque,
});

export const productoCrearSchema = productoBaseSchema.extend({ id: slug });

export type ArtesanoInput = z.infer<typeof artesanoSchema>;
export type ProductoBaseInput = z.infer<typeof productoBaseSchema>;
export type ProductoCrearInput = z.infer<typeof productoCrearSchema>;

// ============================ ATRIBUTOS (JSONB descriptivo) ============================
// Espejo del trigger validar_producto_atributos (0009 C.1): valores por tipo del
// atributo. Como la forma exacta depende de la categoría (catálogo en BD), el schema
// genérico acepta el shape (string | number | boolean) por clave; el contrato fino
// (lista⇒opción válida, numero⇒>=0, etc.) lo IMPONE el trigger, que es la autoridad.
// El builder `atributosSchema(defs)` produce un validador estricto por-categoría para
// cuando Fase 3 tenga las defs de atributosDeCategoria() en mano.
export const atributosJsonbSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

export type AtributoDef = {
  codigo: string;
  tipo: "lista" | "texto" | "numero" | "booleano";
  requerido: boolean;
  opciones?: readonly string[]; // valores permitidos si tipo === 'lista'
};

/**
 * Valida un jsonb de atributos DESCRIPTIVOS contra las defs de una categoría
 * (es_variacion=false). Mismo contrato que el trigger, para dar feedback en el form
 * antes de tocar la BD. `requerido` solo se exige si `exigirRequeridos` (al publicar).
 */
export function atributosSchema(
  defs: readonly AtributoDef[],
  exigirRequeridos = false,
) {
  const permitidos = new Set(defs.map((d) => d.codigo));
  const porCodigo = new Map(defs.map((d) => [d.codigo, d]));
  return atributosJsonbSchema.superRefine((val, ctx) => {
    for (const [k, v] of Object.entries(val)) {
      const def = porCodigo.get(k);
      if (!def || !permitidos.has(k)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [k],
          message: `"${k}" no es un atributo válido de la categoría`,
        });
        continue;
      }
      if (def.tipo === "lista") {
        if (typeof v !== "string" || (def.opciones && !def.opciones.includes(v))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [k],
            message: `Valor no válido para "${k}"`,
          });
        }
      } else if (def.tipo === "numero") {
        if (typeof v !== "number" || v < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [k],
            message: `"${k}" debe ser un número >= 0`,
          });
        }
      } else if (def.tipo === "booleano") {
        if (typeof v !== "boolean") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [k],
            message: `"${k}" debe ser verdadero/falso`,
          });
        }
      } else if (def.tipo === "texto") {
        if (typeof v !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [k],
            message: `"${k}" debe ser texto`,
          });
        }
      }
    }
    if (exigirRequeridos) {
      for (const def of defs) {
        if (def.requerido && !(def.codigo in val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [def.codigo],
            message: `"${def.codigo}" es obligatorio para publicar`,
          });
        }
      }
    }
  });
}

// ============================ VARIANTES / INVENTARIO ============================
// El cliente NUNCA envía sku ni precio_delta_centavos crudos (autoridad de servidor):
// el sku se autogenera y el delta se calcula/deriva en el Server Action. El cliente
// solo elige la COMBINACIÓN de ejes (opciones) y captura stock. Se valida:
//  - opciones: whitelist de ejes es_variacion de la categoría (builder por-categoría).
//  - stock: entero >= 0.
export const stockSchema = z.coerce
  .number({ message: "Stock inválido" })
  .int("Usa un entero")
  .nonnegative("No puede ser negativo")
  .max(1_000_000, "Fuera de rango");

export const opcionesJsonbSchema = z.record(z.string(), z.string());

/**
 * Valida las opciones de una variante contra los EJES es_variacion de la categoría
 * (espejo de validar_variante_opciones, 0009 C.2). `ejes` = defs con es_variacion=true.
 */
export function opcionesSchema(ejes: readonly AtributoDef[]) {
  const porCodigo = new Map(ejes.map((d) => [d.codigo, d]));
  return opcionesJsonbSchema.superRefine((val, ctx) => {
    for (const [k, v] of Object.entries(val)) {
      const def = porCodigo.get(k);
      if (!def) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [k],
          message: `"${k}" no es un eje de variación de la categoría`,
        });
        continue;
      }
      if (def.opciones && !def.opciones.includes(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [k],
          message: `Valor no válido para el eje "${k}"`,
        });
      }
    }
  });
}

export type AtributosInput = z.infer<typeof atributosJsonbSchema>;
export type OpcionesInput = z.infer<typeof opcionesJsonbSchema>;
