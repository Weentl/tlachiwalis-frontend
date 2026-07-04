// heic-convert es CJS sin tipos publicados. Declaración mínima del subconjunto
// que usa el pipeline (convert por-imagen). El paquete solo corre en Node
// (server-only) — la conversión HEIC→JPEG previa a sharp.
declare module "heic-convert" {
  interface ConvertInput {
    /** Buffer del archivo HEIC/HEIF de entrada. */
    buffer: Buffer | Uint8Array;
    /** Formato de salida. */
    format: "JPEG" | "PNG";
    /** Calidad JPEG entre 0 y 1 (ignorada para PNG). */
    quality?: number;
  }
  function convert(input: ConvertInput): Promise<ArrayBuffer>;
  export default convert;
}
