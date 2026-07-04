"use client";
import { useState } from "react";
import Image from "next/image";
import { MediaFrame } from "@/components/framed-image";
import { cn } from "@/lib/utils";
import type { ImagenPieza } from "@/lib/tienda-detalle";

// Galería: foto principal (MediaFrame) + miniaturas. Desktop = tira vertical a la izquierda;
// móvil = tira horizontal debajo. Contador 1/N sobre la foto. Cliente (índice visible).
export function GaleriaPieza({
  imagenes,
  nombre,
}: {
  imagenes: ImagenPieza[];
  nombre: string;
}) {
  const [sel, setSel] = useState(0);
  const activa = imagenes[sel] ?? imagenes[0];
  const multi = imagenes.length > 1;

  return (
    <div className={cn(multi && "md:grid md:grid-cols-[64px_1fr] md:items-start md:gap-3")}>
      {/* Foto principal (DOM primero → arriba en móvil; col 2 en desktop) */}
      <div className="relative md:col-start-2 md:row-start-1">
        <MediaFrame
          src={activa.url}
          alt={activa.alt || nombre}
          aspect="aspect-[4/5]"
          sizes="(max-width: 768px) 100vw, 50vw"
          zoomOnHover={false}
          priority
        />
        {multi ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-tinta/60 px-2.5 py-1 font-mono text-[0.62rem] tracking-[0.1em] text-cal backdrop-blur">
            {sel + 1}/{imagenes.length}
          </span>
        ) : null}
      </div>

      {/* Miniaturas (DOM segundo → debajo en móvil; col 1 en desktop) */}
      {multi ? (
        <div className="no-scrollbar mt-4 flex flex-row gap-3 overflow-x-auto md:col-start-1 md:row-start-1 md:mt-0 md:max-h-[560px] md:flex-col md:overflow-y-auto md:pr-1">
          {imagenes.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setSel(i)}
              aria-label={`Ver foto ${i + 1} de ${nombre}`}
              aria-current={i === sel}
              className={cn(
                "relative aspect-square w-14 shrink-0 overflow-hidden rounded-[12px] transition-all md:w-16",
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
