import { MediaFrame } from "@/components/framed-image";
import { formatMXN } from "@/lib/products";
import { cn } from "@/lib/utils";

/* ProductCard ("Manos") — MediaFrame de esquina suave + sombra cálida, meta en
   mono (dato de origen), precio en grana, badges pill sobre la foto, lift al hover.
   `precioDesde`/`esDesde`/`disponibleTotal`/`tipo` son opcionales; sin ellos funciona.
   Server component (se usa en rejillas SSR). */
export type PiezaCardProps = {
  id: string;
  nombre: string;
  maker?: string | null;
  region?: string | null;
  precio: number;
  precioDesde?: number;
  esDesde?: boolean;
  img: string;
  disponibleTotal?: number;
  tipo?: string | null;
  sizes?: string;
  priority?: boolean;
};

export function PiezaCard({
  id,
  nombre,
  maker,
  region,
  precio,
  precioDesde,
  esDesde,
  img,
  disponibleTotal,
  tipo,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority,
}: PiezaCardProps) {
  const agotado = disponibleTotal !== undefined && disponibleTotal <= 0;
  const precioMostrar = esDesde && precioDesde !== undefined ? precioDesde : precio;
  const meta = [maker, region].filter(Boolean).join(" · ");

  // Un solo badge, prioridad Agotado > única > escasez. Pills; grana solo para
  // "única"; agotado neutro (nunca rojo).
  const badge = agotado
    ? { txt: "Agotado", cls: "bg-cal/85 text-ceniza ring-1 ring-linea backdrop-blur" }
    : tipo === "unico"
      ? { txt: "Única", cls: "bg-grana text-[#FFF7EE] shadow-cta" }
      : tipo === "stock_simple" && disponibleTotal !== undefined && disponibleTotal <= 3
        ? { txt: `Últimas ${disponibleTotal}`, cls: "bg-cal/90 text-grana ring-1 ring-grana/25 backdrop-blur" }
        : null;

  return (
    <a href={`/tienda/${id}`} className="group block">
      <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-1">
        <MediaFrame
          src={img}
          alt={nombre}
          aspect="aspect-[4/5]"
          sizes={sizes}
          muted={agotado}
          priority={priority}
        />
        {badge ? (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em]",
              badge.cls,
            )}
          >
            {badge.txt}
          </span>
        ) : null}
      </div>

      <div className="mt-3.5">
        {meta ? (
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ceniza">
            {meta}
          </p>
        ) : null}
        <h3 className="mt-1 font-display text-[1.15rem] leading-snug text-tinta transition-colors group-hover:text-grana sm:text-[1.25rem]">
          {nombre}
        </h3>
        <p className="mt-1.5 font-sans text-[0.95rem] font-semibold tabular-nums text-grana">
          {esDesde ? (
            <span className="font-mono text-[0.66rem] font-normal uppercase tracking-[0.08em] text-ceniza">
              desde{" "}
            </span>
          ) : null}
          {formatMXN(precioMostrar)}
          <span className="ml-1 text-[0.72em] font-normal text-ceniza">MXN</span>
        </p>
      </div>
    </a>
  );
}

/* Alias con el nombre del nuevo sistema de diseño. */
export const ProductCard = PiezaCard;
