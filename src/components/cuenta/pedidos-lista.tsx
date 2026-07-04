import { formatMXN } from "@/lib/products";
import { cn } from "@/lib/utils";
import type { Pedido } from "@/lib/comprador/pedidos";

const ESTADO: Record<string, { label: string; cls: string }> = {
  pagada: { label: "Pagado", cls: "bg-jade/12 text-jade" },
  pendiente: { label: "Pendiente", cls: "bg-arena text-ceniza" },
  fallida: { label: "No completado", cls: "bg-destructive/10 text-destructive" },
};

export function PedidosLista({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <ul className="max-w-xl space-y-3">
      {pedidos.map((p) => {
        const est = ESTADO[p.status] ?? ESTADO.pendiente;
        const fecha = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
          : "";
        return (
          <li key={p.id} className="rounded-[16px] border border-linea bg-lino p-4 shadow-pieza">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">{fecha}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.1em]", est.cls)}>
                {est.label}
              </span>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm text-tinta">
              {p.items.map((it, i) => (
                <li key={i}>
                  {it.cantidad}× {it.nombre}
                  {Object.values(it.opciones).length ? (
                    <span className="text-ceniza"> · {Object.values(it.opciones).join(" · ")}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right font-display text-lg tabular-nums text-tinta">
              {formatMXN(p.totalCentavos / 100)}
              <span className="ml-1 align-middle font-sans text-xs text-ceniza">MXN</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
