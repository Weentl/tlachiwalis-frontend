"use client";
import * as React from "react";
import Image from "next/image";
import { ImagePlus, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// GALERÍA (Paso 4 del wizard, CREAR). Multi-foto hasta 9; la PRIMERA es la
// portada (el servidor marca es_principal=true en el índice 0 — subirGaleriaNueva).
// Reordenar/portada avanzados y galería completa (borrar/variante) viven en EDITAR.
// Aquí: subir varias, previsualizar, quitar y reordenar arrastrando la portada al
// frente. Los File van al FormData como getAll('imagenes') (mismo orden visual).
//
// El SERVIDOR procesa cada foto (lib/imagenes/pipeline.ts): valida el tipo real
// por magic bytes, convierte HEIC (iPhone) → WebP, elimina EXIF/GPS, reorienta y
// acota a 2000px. Por eso aquí NO rechazamos por tamaño ni convertimos: aceptamos
// HEIC en el input y dejamos que el pipeline haga la conversión y el resize.

const MAX = 9;
const ACEPTA = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

type Foto = { id: string; file: File; url: string };

export function GaleriaUpload({
  name = "imagenes",
  onCountChange,
}: {
  name?: string;
  onCountChange?: (n: number) => void;
}) {
  const [fotos, setFotos] = React.useState<Foto[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  // input file "espejo" que llevará los File reales al form, en el orden visual.
  const realRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    onCountChange?.(fotos.length);
    // Sincroniza el input real del form con el orden actual (DataTransfer).
    if (realRef.current) {
      const dt = new DataTransfer();
      for (const f of fotos) dt.items.add(f.file);
      realRef.current.files = dt.files;
    }
  }, [fotos, onCountChange]);

  React.useEffect(() => {
    return () => {
      for (const f of fotos) URL.revokeObjectURL(f.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agregar = (files: FileList | null) => {
    if (!files) return;
    setFotos((prev) => {
      const cupo = Math.max(0, MAX - prev.length);
      const nuevas = Array.from(files)
        .slice(0, cupo)
        .map((file) => ({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          url: URL.createObjectURL(file),
        }));
      return [...prev, ...nuevas];
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const quitar = (id: string) =>
    setFotos((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return prev.filter((x) => x.id !== id);
    });

  const hacerPortada = (id: string) =>
    setFotos((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (i <= 0) return prev;
      const copia = [...prev];
      const [f] = copia.splice(i, 1);
      copia.unshift(f);
      return copia;
    });

  return (
    <div className="space-y-3">
      {/* input REAL (oculto) que viaja en el FormData con el orden visual */}
      <input ref={realRef} type="file" name={name} accept={ACEPTA} multiple className="hidden" tabIndex={-1} aria-hidden />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {fotos.map((f, i) => (
          <div
            key={f.id}
            className="group relative aspect-square overflow-hidden rounded-ob-sm border border-tinto/20 bg-background"
          >
            <Image src={f.url} alt="" fill sizes="120px" className="object-cover" unoptimized />
            {i === 0 ? (
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-ob-sm bg-tinto/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#f7f1e6]">
                <Star className="h-3 w-3 fill-current" /> Portada
              </span>
            ) : (
              <button
                type="button"
                onClick={() => hacerPortada(f.id)}
                title="Hacer portada"
                className="absolute left-1.5 top-1.5 rounded-ob-sm bg-background/85 p-1 text-tinto opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => quitar(f.id)}
              title="Quitar"
              className="absolute right-1.5 top-1.5 rounded-ob-sm bg-background/85 p-1 text-destructive opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {fotos.length < MAX ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-ob-sm border border-dashed border-tinto/30 bg-tinto/[0.02] text-muted-foreground transition-colors hover:border-tinto/60 hover:bg-tinto/5 hover:text-tinto",
            )}
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-[11px] uppercase tracking-wide">Agregar</span>
          </button>
        ) : null}
      </div>

      {/* input visible que dispara la selección (no viaja al form) */}
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA}
        multiple
        onChange={(e) => agregar(e.target.files)}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Hasta {MAX} fotos (JPG, PNG, WebP o HEIC de iPhone). Las optimizamos al
        subir. La primera es la portada; toca la estrella para cambiarla.
      </p>
    </div>
  );
}
