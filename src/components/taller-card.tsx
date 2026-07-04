import { MediaFrame } from "@/components/framed-image";

// Card de taller para el índice /talleres. Retrato grande (artesano como obra) + oficio·región
// en mono + conteo de piezas. Fallback con inicial si no hay retrato.
export function TallerCard({
  slug,
  nombre,
  oficio,
  region,
  fotoUrl,
  numPiezas,
}: {
  slug: string;
  nombre: string;
  oficio: string | null;
  region: string | null;
  fotoUrl: string | null;
  numPiezas: number;
}) {
  const meta = [oficio, region].filter(Boolean).join(" · ");
  return (
    <a href={`/taller/${slug}`} className="group block">
      <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
        {fotoUrl ? (
          <MediaFrame
            src={fotoUrl}
            alt={nombre}
            aspect="aspect-[4/5]"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-[20px] bg-arena ring-1 ring-linea">
            <span className="font-display text-6xl text-grana/40">{nombre.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="mt-3.5">
        {meta ? (
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ceniza">{meta}</p>
        ) : null}
        <h3 className="mt-1 font-display text-2xl leading-tight text-tinta transition-colors group-hover:text-grana">
          {nombre}
        </h3>
        {numPiezas > 0 ? (
          <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ceniza">
            {numPiezas} {numPiezas === 1 ? "pieza" : "piezas"}
          </p>
        ) : null}
      </div>
    </a>
  );
}
