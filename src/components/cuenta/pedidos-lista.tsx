import { formatMXN } from "@/lib/products";
import { cn } from "@/lib/utils";
import type { Pedido, FulfillmentComprador } from "@/lib/comprador/pedidos";
import { PASOS_PEDIDO, RANK, ESTADO_INFO, estadoAgregado } from "@/lib/pedidos/estados";

const PAGO: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pago pendiente", cls: "bg-arena text-ceniza" },
  fallida: { label: "No completado", cls: "bg-destructive/10 text-destructive" },
  cancelada: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
};

// Línea de tiempo Comprado → Confirmado → Enviado → Entregado.
function Timeline({ fulfillments }: { fulfillments: FulfillmentComprador[] }) {
  const agg = estadoAgregado(fulfillments.map((f) => f.estado));
  const guiaFf = fulfillments.find((f) => f.guia);

  if (agg === "cancelado") {
    return (
      <p className="mt-3 rounded-[10px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        Pedido cancelado.
      </p>
    );
  }

  const rankAgg = RANK[agg];
  return (
    <div className="mt-3">
      <div className="flex items-center">
        {PASOS_PEDIDO.map((paso, i) => {
          const hecho = rankAgg >= RANK[paso.estado];
          const color = hecho ? ESTADO_INFO[paso.estado].color : "#d9cfc0";
          return (
            <div key={paso.estado} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className="grid h-5 w-5 place-items-center rounded-full text-[0.6rem] text-cal" style={{ background: color }}>
                  {hecho ? "✓" : ""}
                </span>
                <span className={cn("whitespace-nowrap text-[0.62rem]", hecho ? "text-tinta" : "text-ceniza/60")}>
                  {paso.label}
                </span>
              </div>
              {i < PASOS_PEDIDO.length - 1 ? (
                <span className="mx-1 mb-4 h-px flex-1" style={{ background: rankAgg > RANK[paso.estado] ? ESTADO_INFO[paso.estado].color : "#e6ddce" }} />
              ) : null}
            </div>
          );
        })}
      </div>
      {guiaFf && rankAgg >= RANK.enviado ? (
        <p className="mt-2.5 text-xs text-ceniza">
          Guía <span className="font-mono text-tinta">{guiaFf.guia}</span>
          {guiaFf.paqueteria ? ` · ${guiaFf.paqueteria}` : ""}
          {guiaFf.guiaUrl ? (
            <>
              {" · "}
              <a href={guiaFf.guiaUrl} target="_blank" rel="noopener noreferrer" className="text-grana underline underline-offset-2">
                Rastrear
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function PedidosLista({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <ul className="max-w-xl space-y-3">
      {pedidos.map((p) => {
        const fecha = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
          : "";
        const pagado = p.status === "pagada";
        const badge = pagado
          ? { label: ESTADO_INFO[estadoAgregado(p.fulfillments.map((f) => f.estado))].corto, cls: "bg-jade/12 text-jade" }
          : PAGO[p.status] ?? PAGO.pendiente;
        return (
          <li key={p.id} className="rounded-[16px] border border-linea bg-lino p-4 shadow-pieza">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">{fecha}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.1em]", badge.cls)}>
                {badge.label}
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

            {pagado && p.fulfillments.length > 0 ? <Timeline fulfillments={p.fulfillments} /> : null}

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
