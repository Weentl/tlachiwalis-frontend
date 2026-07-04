import Link from "next/link";
import Image from "next/image";
import { MediaFrame } from "@/components/framed-image";
import { formatMXN, type CardProducto } from "@/lib/products";
import type { ArtesanoPublico } from "@/lib/artesano-publico";

// Spotlight de un taller: la diferencia contra un catálogo genérico — aquí hay una persona.
// Banda añil (confianza). Retrato en arco (Portal). Corta el ritmo de mercancía con narrativa.
export function TallerSpotlight({
  artesano,
  piezas,
}: {
  artesano: ArtesanoPublico;
  piezas: CardProducto[];
}) {
  const cita = artesano.semblanza ? artesano.semblanza.split(/(?<=[.!?])\s/)[0] : null;
  const meta = [artesano.oficio, artesano.region].filter(Boolean).join(" · ");

  return (
    <section className="bg-anil text-cal">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:gap-14 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-sm">
          {artesano.fotoUrl ? (
            <MediaFrame src={artesano.fotoUrl} alt={artesano.nombre} aspect="aspect-[4/5]" sizes="400px" variant="portal" zoomOnHover={false} />
          ) : (
            <div className="portal flex aspect-[4/5] items-center justify-center bg-anil/50 ring-1 ring-cal/20">
              <span className="font-display text-6xl text-cal/40">{artesano.nombre.charAt(0)}</span>
            </div>
          )}
        </div>

        <div>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-cal/70">
            El taller del mes{artesano.region ? ` · ${artesano.region}` : ""}
          </p>
          {cita ? (
            <blockquote className="mt-4 font-display text-3xl leading-snug sm:text-[2.5rem]">
              &ldquo;{cita}&rdquo;
            </blockquote>
          ) : null}
          <p className="mt-6 text-cal/85">
            {artesano.nombre}
            {meta ? ` · ${meta}` : ""}
          </p>

          {piezas.length > 0 ? (
            <div className="mt-7 flex gap-4">
              {piezas.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/tienda/${p.id}`} className="group w-24 shrink-0">
                  <div className="relative aspect-square overflow-hidden rounded-[12px] bg-anil/40">
                    <Image src={p.img} alt={p.nombre} fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <p className="mt-1.5 font-sans text-xs tabular-nums text-cal/80">{formatMXN(p.precio)}</p>
                </Link>
              ))}
            </div>
          ) : null}

          <Link
            href={`/taller/${artesano.slug}`}
            className="mt-8 inline-block rounded-full border border-cal/40 px-5 py-2.5 text-sm text-cal transition-colors hover:bg-cal/10"
          >
            Visitar su taller →
          </Link>
        </div>
      </div>
    </section>
  );
}
