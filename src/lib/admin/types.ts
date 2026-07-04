// 'pendiente' = registrado, en revisión del admin (no accede hasta aprobación, 0014).
export type ArtesanoStatus = "activo" | "pausado" | "pendiente";
export type ProductoStatus = "borrador" | "publicado" | "agotado";
// Forma del producto (0009 PARTE A: productos_tipo_producto_check).
// 'unico' = pieza única (stock 1, sin ejes). 'stock_simple' = un SKU con stock>1.
// 'con_variantes' = múltiples combinaciones de ejes es_variacion.
export type ProductoTipo = "unico" | "stock_simple" | "con_variantes";

export type ArtesanoAdmin = {
  id: string;
  slug: string;
  nombre: string;
  // Nombre del taller/comercio + contacto (correo/WhatsApp). El admin los captura al alta.
  taller: string | null;
  contacto: string | null;
  semblanza: string | null;
  region: string | null;
  oficio: string | null;
  foto_url: string | null;
  // Datos fiscales SENSIBLES: solo el admin los lee (RLS). Nunca exponer fuera.
  rfc: string | null;
  regimen_fiscal: string | null;
  clabe: string | null;
  status: ArtesanoStatus;
  // Enlace a la cuenta auth del artesano (0008). null = aún no reclama su acceso.
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // Cobros (Stripe Connect). NO sensibles (el RFC/CLABE reales viven en Stripe, no aquí).
  stripe_account_id: string | null;
  cobros_habilitados: boolean;
  cobros_detalles_enviados: boolean;
  // Taller de EXHIBICIÓN (demo): puede publicar pero sus piezas no son comprables.
  es_demo: boolean;
  // Datos del REGISTRO autoguiado (0013): lo que el artesano llenó en nuestro onboarding.
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  telefono: string | null;
  tipo_vendedor: string | null;
  nombre_negocio: string | null;
  num_personas: number | null;
  direccion: { ciudad?: string | null } | null;
  redes: { instagram?: string | null; sitio?: string | null } | null;
  envia_nacional: boolean | null;
  anios_experiencia: number | null;
};

export type ProductoAdmin = {
  id: string;
  artesano_id: string | null;
  nombre: string;
  maker: string | null;
  oficio: string;
  region: string;
  precio_centavos: number;
  moneda: string;
  imagen: string | null;
  descripcion: string | null;
  tecnica: string | null;
  materiales: string | null;
  // medidas: LEGADO. Se conserva como "descripcion_medidas" libre para el comprador;
  // las medidas ESTRUCTURADAS viven en `atributos` (0009 PARTE A).
  medidas: string | null;
  status: ProductoStatus;
  // ── Modelo de producto (0009 PARTE A). Todas nullable/con default en BD: aditivas. ──
  // FK a public.categorias(id). NULL en migración; NOT NULL solo al publicar (CHECK
  // condicional productos_publicar_categoria_check). smallint en BD → number aquí.
  categoria_id: number | null;
  // Atributos DESCRIPTIVOS (no-variante), validados por trigger contra la categoría.
  // NO incluye ejes es_variacion (esos viven en Variante.opciones).
  atributos: Record<string, string | number | boolean>;
  tipo_producto: ProductoTipo;
  // Dimensiones de EMPAQUE para envío (enteros base: gramos / milímetros).
  peso_gramos: number | null;
  largo_mm: number | null;
  ancho_mm: number | null;
  alto_mm: number | null;
  // SAT: override opcional a nivel producto (default hereda de la categoría). Solo admin.
  clave_prod_serv: string | null;
  // Gancho fiscal/envío (default = precio_centavos).
  valor_declarado_centavos: number | null;
  created_at: string;
  updated_at: string;
};

// ── Variante (0009 producto_variantes). TODO producto tiene ≥1. Pieza única =
//    variante default opciones={} (el artesano nunca ve "variante"). El precio
//    efectivo SIEMPRE se recalcula en servidor: precio_centavos + precio_delta_centavos. ──
export type Variante = {
  id: string;
  producto_id: string;
  // Autogenerado server-side (patrón <producto_id>-U para la default). Jamás del cliente.
  sku: string;
  // Solo ejes es_variacion, p.ej. {"talla":"M","color":"anil"}. {} = variante default.
  opciones: Record<string, string>;
  // Delta sobre productos.precio_centavos. Autoridad de servidor, nunca del cliente.
  precio_delta_centavos: number;
  imagen_variante_id: string | null;
  activa: boolean;
  created_at: string;
};

// ── Inventario (0009 inventario). 1:1 con la variante (PK = variante_id).
//    disponible es GENERATED (stock - reservado). Decremento atómico en checkout futuro. ──
export type Inventario = {
  variante_id: string;
  stock: number;
  reservado: number;
  disponible: number;
  permitir_backorder: boolean;
  updated_at: string;
};

// Variante enriquecida con su fila de inventario (lectura conjunta habitual del panel).
export type VarianteConInventario = Variante & {
  inventario: Inventario | null;
};

// ── Imagen de galería (0009 producto_imagenes). storage_path es RELATIVO al bucket
//    'piezas' (NUNCA URL absoluta): la app construye la URL con getPublicUrl(path).
//    variante_id NULL = foto general de la pieza. ──
export type ImagenProducto = {
  id: string;
  producto_id: string;
  variante_id: string | null;
  storage_path: string;
  alt: string | null;
  orden: number;
  es_principal: boolean;
  ancho: number | null;
  alto: number | null;
  bytes: number | null;
  created_at: string;
};

// ── Taxonomía (0007). Catálogo NO sensible: lectura pública, escritura admin. ──
export type AtributoTipo = "lista" | "texto" | "numero" | "booleano";

export type Categoria = {
  id: number;
  slug: string;
  nombre: string;
  parent_id: number | null;
  clave_prod_serv: string | null;
  clave_unidad: string;
  objeto_impuesto: string;
  orden: number;
  activa: boolean;
  created_at: string;
};

export type Atributo = {
  id: number;
  codigo: string;
  nombre: string;
  tipo: AtributoTipo;
  unidad: string | null;
  filtrable: boolean;
  ayuda_texto: string | null;
};

export type AtributoOpcion = {
  id: number;
  atributo_id: number;
  valor: string;
  etiqueta: string;
  hex: string | null;
  orden: number;
};

export type CategoriaAtributo = {
  categoria_id: number;
  atributo_id: number;
  es_variacion: boolean;
  requerido: boolean;
  orden: number;
};

// Atributo resuelto para el formulario dinámico de una categoría: junta
// categoria_atributos + atributos (+ sus opciones si es tipo 'lista').
export type AtributoDeCategoria = Atributo & {
  es_variacion: boolean;
  requerido: boolean;
  orden: number;
  opciones: AtributoOpcion[];
};

export type ArtesanoOpcion = { id: string; nombre: string };

/** Estado de retorno de las Server Actions (firma de useActionState). */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};
