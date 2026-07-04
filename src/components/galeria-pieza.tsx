"use client";
import { useState } from "react";
import Image from "next/image";
import { MediaFrame } from "@/components/framed-image";
import { cn } from "@/lib/utils";
import type { ImagenPieza } from "@/lib/tienda-detalle";

// Galería de la pieza: foto principal (MediaFrame) + tira de miniaturas redondeadas.
// Cliente (solo estado local del índice visible).
export function GaleriaPieza({
  imagenes,
  nombre,
}: {
  imagenes: ImagenPieza[];
  nombre: string;
}) {
  const [sel, setSel] = useState(0);
  const activa = imagenes[sel] ?? imagenes[0];

  return (
    <div>
      <MediaFrame
        src={activa.url}
        alt={activa.alt || nombre}
        aspect="aspect-[4/5]"
        sizes="(max-width: 768px) 100vw, 50vw"
        zoomOnHover={false}
        priority
      />
      {imagenes.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {imagenes.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setSel(i)}
              aria-label={`Ver foto ${i + 1} de ${nombre}`}
              aria-current={i === sel}
              className={cn(
                "relative aspect-square w-16 overflow-hidden rounded-[12px] transition-all",
                i === sel
                  ? "ring-2 ring-grana ring-offset-2 ring-offset-cal"
                  : "ring-1 ring-linea hover:ring-ceniza/50",
              )}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
