import Link from "next/link";
import type { Conteo } from "@/lib/escaparate";

// "¿De dónde viene?": segunda puerta de exploración (geográfica). Lista tipográfica, no otra
// rejilla de cards — ligereza y variación de ritmo. Refuerza autenticidad (cada pieza tiene tierra).
export function RegionesBand({ regiones }: { regiones: Conteo[] }) {
  if (regiones.length === 0) return null;
  return (
    <section className="bg-arena py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">¿De dónde viene?</h2>
        <p className="mt-2 text-ceniza">Cada pieza carga el nombre de su tierra.</p>
        <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-4">
          {regiones.map((r) => (
            <Link
              key={r.nombre}
              href={`/tienda?region=${encodeURIComponent(r.nombre)}`}
              className="group inline-flex items-baseline gap-2"
            >
              <span className="font-display text-2xl text-tinta transition-colors group-hover:text-grana sm:text-3xl">
                {r.nombre}
              </span>
              <span className="font-mono text-[0.66rem] tabular-nums text-ceniza">{r.num}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
