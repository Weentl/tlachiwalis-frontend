import Link from "next/link";
import { PiezaCard } from "@/components/pieza-card";
import type { CardProducto } from "@/lib/products";

// Carril horizontal de piezas (scroll-snap). Reutilizado en landing y tienda.
export function PiezaRail({
  eyebrow,
  titulo,
  apoyo,
  verTodoHref,
  verTodoLabel = "Ver todo →",
  productos,
}: {
  eyebrow?: string;
  titulo: string;
  apoyo?: string;
  verTodoHref?: string;
  verTodoLabel?: string;
  productos: CardProducto[];
}) {
  if (productos.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-6 md:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1.5 font-display text-3xl text-tinta sm:text-4xl">{titulo}</h2>
          {apoyo ? <p className="mt-2 max-w-lg text-ceniza">{apoyo}</p> : null}
        </div>
        {verTodoHref ? (
          <Link href={verTodoHref} className="shrink-0 text-sm font-medium text-grana hover:underline">
            {verTodoLabel}
          </Link>
        ) : null}
      </div>

      <div className="no-scrollbar mt-8 -mx-5 flex snap-x gap-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        {productos.map((p) => (
          <div key={p.id} className="w-[58vw] max-w-[240px] shrink-0 snap-start sm:w-[240px]">
            <PiezaCard
              id={p.id}
              nombre={p.nombre}
              maker={p.maker}
              region={p.region}
              precio={p.precio}
              precioDesde={p.precioDesde}
              esDesde={p.esDesde}
              img={p.img}
              disponibleTotal={p.disponibleTotal}
              tipo={p.tipo}
              sizes="240px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
