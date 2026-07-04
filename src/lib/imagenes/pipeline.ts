import "server-only";
import sharp from "sharp";

// ════════════════════════════════════════════════════════════════════════════
// PIPELINE DE FOTOS (Fase 2) — server-only. Toda foto de galería pasa por aquí
// ANTES de tocar Storage. Objetivos, en orden:
//   1. Validar el tipo por MAGIC BYTES (firma real del buffer), no por file.type
//      ni por extensión (ambos mienten). Rechaza SVG (vector → XSS en un bucket
//      público servido inline) y cualquier firma desconocida.
//   2. HEIC/HEIF (iPhone) → intermedio JPEG vía heic-convert (el prebuilt de
//      sharp no trae el codec HEIF por patente).
//   3. Anti-bomba de descompresión: limitInputPixels acotado (NO Infinity) +
//      failOn 'truncated'. Un PNG chico en bytes puede declarar dimensiones
//      enormes y agotar RAM al decodificar.
//   4. .rotate() sin args → auto-orienta según EXIF Orientation, ANTES de que
//      sharp descarte la metadata al re-encodear (no usamos withMetadata()) →
//      se eliminan GPS del taller, marca de cámara y timestamps.
//   5. Resize inside 2000px (lado mayor), sin ampliar piezas pequeñas, sin
//      recortar (el object-cover se aplica en UI).
//   6. WebP q82. La salida SIEMPRE es image/webp; el path pasa a .webp.
//
// El tope de bytes de ENTRADA se capa antes de decodificar (defensa barata
// anti-DoS); el pipeline suma el tope por PÍXELES además del de bytes.

export type ImagenProcesada = {
  buffer: Buffer;
  contentType: "image/webp";
  ancho: number;
  alto: number;
  bytes: number;
};

type Opts = {
  /** Lado mayor máximo (px). Default 2000. */
  maxLado?: number;
  /** Calidad WebP 1..100. Default 82 (blueprint). */
  calidad?: number;
  /** Tope de bytes de ENTRADA (antes de decodificar). Default 15 MB. */
  maxBytesEntrada?: number;
  /** Tope de píxeles al decodificar (anti-bomba). Default ~24 MP. */
  maxPixeles?: number;
};

const MAX_LADO = 2000;
const CALIDAD = 82;
const MAX_BYTES_ENTRADA = 15 * 1024 * 1024; // 15 MB
const MAX_PIXELES = 24_000_000; // ≈ 6000×4000. NUNCA Infinity.

const ERR_TIPO =
  "Formato de imagen no permitido. Usa JPG, PNG, WebP o HEIC (foto de iPhone).";
const ERR_CORRUPTA = "La imagen es demasiado grande o está dañada.";
const ERR_GRANDE = "La imagen supera el tamaño permitido.";

type FirmaTipo = "jpeg" | "png" | "webp" | "heif";

// ── Detección de tipo por MAGIC BYTES (autoridad; file.type deja de decidir) ──
// JPEG: FF D8 FF. PNG: 89 50 4E 47 0D 0A 1A 0A. WebP: 'RIFF'....'WEBP'.
// HEIC/HEIF: caja 'ftyp' en bytes 4..8 con brand heic/heix/hevc/hevx/mif1/msf1.
function detectarTipo(b: Buffer): FirmaTipo | null {
  if (b.length < 12) return null;

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";

  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return "png";

  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";

  // ISO-BMFF (HEIF/HEIC): 'ftyp' en el offset 4; el brand mayor está en 8..12.
  if (b.toString("ascii", 4, 8) === "ftyp") {
    const brand = b.toString("ascii", 8, 12).toLowerCase();
    const brandsHeif = ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"];
    if (brandsHeif.includes(brand)) return "heif";
  }

  return null; // incluye SVG (texto/vector), GIF, PDF, "polyglots", etc.
}

// heic-convert es CJS sin tipos; lo tipamos localmente en types/heic-convert.d.ts.
async function heicAJpeg(buffer: Buffer): Promise<Buffer> {
  const convert = (await import("heic-convert")).default;
  const salida = await convert({ buffer, format: "JPEG", quality: 0.92 });
  return Buffer.from(salida);
}

function aBuffer(input: ArrayBuffer | Buffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(new Uint8Array(input));
}

/**
 * Procesa una imagen de galería: valida tipo real, normaliza orientación,
 * elimina metadata (EXIF/GPS), acota dimensiones y re-encodea a WebP.
 * Lanza Error con mensaje humano en cada rechazo (tipo, tamaño, corrupción).
 */
export async function procesarImagen(
  input: ArrayBuffer | Buffer,
  opts: Opts = {},
): Promise<ImagenProcesada> {
  const maxLado = opts.maxLado ?? MAX_LADO;
  const calidad = opts.calidad ?? CALIDAD;
  const maxBytesEntrada = opts.maxBytesEntrada ?? MAX_BYTES_ENTRADA;
  const maxPixeles = opts.maxPixeles ?? MAX_PIXELES;

  let buf = aBuffer(input);

  // 0) Tope de bytes de ENTRADA (antes de decodificar → defensa barata).
  if (buf.length === 0) throw new Error(ERR_CORRUPTA);
  if (buf.length > maxBytesEntrada) throw new Error(ERR_GRANDE);

  // 1) Tipo AUTORITATIVO por magic bytes.
  const tipo = detectarTipo(buf);
  if (!tipo) throw new Error(ERR_TIPO);

  // 2) HEIC/HEIF → JPEG intermedio (sharp del prebuilt no decodifica HEIF).
  if (tipo === "heif") {
    try {
      buf = await heicAJpeg(buf);
    } catch {
      throw new Error(
        "No se pudo leer la foto de iPhone (HEIC). Prueba con JPG o PNG.",
      );
    }
  }

  // 3) Instancia sharp con anti-bomba: límite de píxeles acotado + failOn.
  const img = sharp(buf, {
    limitInputPixels: maxPixeles,
    failOn: "truncated",
  });

  // 3b) Chequeo temprano por metadata (rechaza antes de decodificar completo).
  try {
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > 0 && h > 0 && w * h > maxPixeles) throw new Error(ERR_CORRUPTA);
  } catch (e) {
    // metadata() puede lanzar en un buffer dañado o si excede el límite.
    if (e instanceof Error && e.message === ERR_CORRUPTA) throw e;
    throw new Error(ERR_CORRUPTA);
  }

  // 4→6) Auto-orientar (aplica EXIF y luego lo descarta), resize inside sin
  // ampliar, re-encodear a WebP. sharp por defecto NO copia metadata → sin GPS.
  let out;
  try {
    out = await img
      .rotate() // EXIF Orientation → píxeles; el resto de metadata se descarta.
      .resize({
        width: maxLado,
        height: maxLado,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: calidad })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error(ERR_CORRUPTA);
  }

  return {
    buffer: out.data,
    contentType: "image/webp",
    ancho: out.info.width,
    alto: out.info.height,
    bytes: out.info.size,
  };
}
