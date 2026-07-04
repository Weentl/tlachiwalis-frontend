import Link from "next/link";
import { MediaFrame } from "@/components/framed-image";
import type { OficioVitrina } from "@/lib/escaparate";

// "Entra por el oficio": el mapa del sitio en imágenes, con máscara de arco (Portal =
// puerta al taller). Cada bloque muestra región (mono) y conteo — dato, no adorno.
export function OficioTiles({ oficios }: { oficios: OficioVitrina[] }) {
  if (oficios.length === 0) return null;
  return (
    <section id="oficios" className="scroll-mt-24 bg-arena py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">Entra por el oficio</h2>
        <p className="mt-2 max-w-lg text-ceniza">
          Cinco saberes, cinco maneras de hacer. Elige por dónde empezar.
        </p>
        <div className="no-scrollbar mt-9 -mx-5 flex snap-x gap-5 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0">
          {oficios.map((o) => (
            <Link
              key={o.nombre}
              href={`/tienda?oficio=${encodeURIComponent(o.nombre)}`}
              className="group w-[60vw] max-w-[260px] shrink-0 snap-start md:w-auto md:max-w-none"
            >
              <div className="transition-transform duration-300 group-hover:-translate-y-1">
                <MediaFrame src={o.img} alt={o.nombre} aspect="aspect-[3/4]" sizes="260px" variant="portal" />
              </div>
              <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ceniza">{o.region}</p>
              <p className="font-display text-xl text-tinta transition-colors group-hover:text-grana">{o.nombre}</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">
                {o.num} {o.num === 1 ? "pieza" : "piezas"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
