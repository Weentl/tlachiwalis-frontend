"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { avanzarPedido } from "@/app/vendedor/(panel)/pedidos/actions";
import { ESTADO_INFO, accionesDesde, type EstadoFulfillment, type EstadoDestino } from "@/lib/pedidos/estados";
import type { PedidoVendedor } from "@/lib/vendedor/pedidos";
import { cn } from "@/lib/utils";

const peso = (c: number) => "$" + Math.round(c / 100).toLocaleString("es-MX");
const fecha = (s: string) =>
  s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "";

function Badge({ estado }: { estado: EstadoFulfillment }) {
  const info = ESTADO_INFO[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `${info.color}14`, color: info.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
      {info.corto}
    </span>
  );
}

function Fila({ p }: { p: PedidoVendedor }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<null | "enviar" | "cancelar">(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paqueteria, setPaqueteria] = useState("");
  const [guia, setGuia] = useState("");
  const [guiaUrl, setGuiaUrl] = useState("");
  const [motivo, setMotivo] = useState("");

  const acciones = accionesDesde(p.estado);

  const run = async (estado: EstadoDestino, extra?: { paqueteria?: string; guia?: string; guiaUrl?: string; nota?: string }) => {
    setPending(true);
    setError(null);
    const r = await avanzarPedido({ id: p.id, estado, ...extra });
    setPending(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAbierto(null);
    router.refresh();
  };

  const d = p.destino;
  const destinoLinea = d ? [d.calle, d.colonia, d.ciudad, d.estado, d.cp].filter(Boolean).join(", ") : null;

  return (
    <div className="card-warm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{p.orderId.replace(/^ord_/, "").slice(0, 8)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{fecha(p.createdAt)}</p>
        </div>
        <Badge estado={p.estado} />
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {p.items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-foreground">
              {it.nombre} <span className="text-muted-foreground">×{it.cantidad}</span>
              {Object.values(it.opciones).length ? (
                <span className="ml-1.5 text-xs text-muted-foreground">{Object.values(it.opciones).join(" · ")}</span>
              ) : null}
            </span>
            <span className="tabular-nums text-muted-foreground">{peso(it.subtotalCentavos)}</span>
          </li>
        ))}
      </ul>

      {d ? (
        <div className="mt-3 rounded-ob-sm border border-tinto/10 bg-tinto/[0.02] p-3 text-sm">
          <p className="font-medium text-foreground">Enviar a: {d.destinatario || "—"}</p>
          <p className="text-muted-foreground">{destinoLinea}</p>
          {d.telefono ? <p className="text-muted-foreground">Tel. {d.telefono}</p> : null}
          {d.referencias ? <p className="mt-0.5 text-xs text-muted-foreground">Ref: {d.referencias}</p> : null}
        </div>
      ) : null}

      {p.estado === "enviado" && p.guia ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Guía <span className="font-mono text-foreground">{p.guia}</span>
          {p.paqueteria ? ` · ${p.paqueteria}` : ""}
        </p>
      ) : null}
      {p.estado === "cancelado" && p.nota ? (
        <p className="mt-3 text-sm text-destructive">Cancelado: {p.nota}</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-ob-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Sub-formulario: marcar enviado */}
      {abierto === "enviar" ? (
        <div className="mt-3 space-y-2.5 rounded-ob-sm border border-tinto/12 p-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input value={paqueteria} onChange={(e) => setPaqueteria(e.target.value)} placeholder="Paquetería (Estafeta, DHL…)" className="rounded-ob-sm border border-tinto/15 bg-background px-3 py-2 text-sm outline-none focus:border-tinto" />
            <input value={guia} onChange={(e) => setGuia(e.target.value)} placeholder="Número de guía *" className="rounded-ob-sm border border-tinto/15 bg-background px-3 py-2 text-sm outline-none focus:border-tinto" />
          </div>
          <input value={guiaUrl} onChange={(e) => setGuiaUrl(e.target.value)} placeholder="Link de rastreo (opcional)" className="w-full rounded-ob-sm border border-tinto/15 bg-background px-3 py-2 text-sm outline-none focus:border-tinto" />
          <div className="flex items-center gap-3">
            <button type="button" disabled={pending} onClick={() => run("enviado", { paqueteria, guia, guiaUrl })} className="rounded-ob-sm bg-tinto px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23] disabled:opacity-50">
              {pending ? "Guardando…" : "Confirmar envío"}
            </button>
            <button type="button" onClick={() => setAbierto(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
        </div>
      ) : abierto === "cancelar" ? (
        <div className="mt-3 space-y-2.5 rounded-ob-sm border border-destructive/25 p-3">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la cancelación" className="w-full rounded-ob-sm border border-tinto/15 bg-background px-3 py-2 text-sm outline-none focus:border-tinto" />
          <div className="flex items-center gap-3">
            <button type="button" disabled={pending} onClick={() => run("cancelado", { nota: motivo })} className="rounded-ob-sm border border-destructive/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
              {pending ? "Cancelando…" : "Confirmar cancelación"}
            </button>
            <button type="button" onClick={() => setAbierto(null)} className="text-xs text-muted-foreground hover:text-foreground">Volver</button>
          </div>
        </div>
      ) : acciones.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {acciones.map((a) =>
            a.requiereGuia ? (
              <button key={a.estado} type="button" onClick={() => setAbierto("enviar")} className="rounded-ob-sm bg-tinto px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]">
                {a.label}
              </button>
            ) : a.destructiva ? (
              <button key={a.estado} type="button" onClick={() => setAbierto("cancelar")} className="rounded-ob-sm px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive">
                {a.label}
              </button>
            ) : (
              <button key={a.estado} type="button" disabled={pending} onClick={() => run(a.estado)} className="rounded-ob-sm bg-tinto px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23] disabled:opacity-50">
                {pending ? "…" : a.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function PedidosVendedor({ pedidos }: { pedidos: PedidoVendedor[] }) {
  const [filtro, setFiltro] = useState<"activos" | "todos">("activos");
  const activos = pedidos.filter((p) => p.estado !== "entregado" && p.estado !== "cancelado");
  const lista = filtro === "activos" ? activos : pedidos;

  if (pedidos.length === 0) {
    return (
      <p className="card-warm px-5 py-14 text-center text-sm text-muted-foreground">
        Aún no tienes pedidos. Cuando alguien compre tus piezas, aparecerán aquí para que los confirmes y envíes.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {(["activos", "todos"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={cn(
              "rounded-ob-sm px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === f ? "bg-tinto/8 text-tinto" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "activos" ? `Por atender (${activos.length})` : `Todos (${pedidos.length})`}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="card-warm px-5 py-14 text-center text-sm text-muted-foreground">
          No tienes pedidos por atender. ¡Todo al día!
        </p>
      ) : (
        <div className="grid gap-4">
          {lista.map((p) => (
            <Fila key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
