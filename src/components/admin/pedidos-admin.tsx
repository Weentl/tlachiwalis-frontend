"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { avanzarPedidoAdmin } from "@/app/admin/(panel)/pedidos/actions";
import { ESTADO_INFO, accionesDesde, type EstadoFulfillment, type EstadoDestino } from "@/lib/pedidos/estados";
import type { PedidoAdmin } from "@/lib/admin/pedidos";
import { cn } from "@/lib/utils";

const fecha = (s: string) =>
  s ? new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "";

const ESTADOS: (EstadoFulfillment | "activos")[] = ["activos", "por_validar", "validado", "enviado", "entregado", "cancelado"];

export function PedidosAdmin({ pedidos }: { pedidos: PedidoAdmin[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<(typeof ESTADOS)[number]>("activos");
  const [editando, setEditando] = useState<{ id: string; tipo: "enviar" | "cancelar" } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);
  const [paqueteria, setPaqueteria] = useState("");
  const [guia, setGuia] = useState("");
  const [motivo, setMotivo] = useState("");

  const lista = pedidos.filter((p) =>
    filtro === "activos" ? p.estado !== "entregado" && p.estado !== "cancelado" : p.estado === filtro,
  );
  const activosN = pedidos.filter((p) => p.estado !== "entregado" && p.estado !== "cancelado").length;

  const run = async (p: PedidoAdmin, estado: EstadoDestino, extra?: { paqueteria?: string; guia?: string; nota?: string }) => {
    setPending(true);
    setError(null);
    const r = await avanzarPedidoAdmin({ id: p.id, estado, ...extra });
    setPending(false);
    if (!r.ok) {
      setError({ id: p.id, msg: r.error });
      return;
    }
    setEditando(null);
    setPaqueteria("");
    setGuia("");
    setMotivo("");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {ESTADOS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={cn(
              "rounded-ob-sm px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filtro === f ? "bg-tinto/8 text-tinto" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "activos" ? `Activos (${activosN})` : ESTADO_INFO[f].corto}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="card-warm px-5 py-14 text-center text-sm text-muted-foreground">
          No hay pedidos en este estado.
        </p>
      ) : (
        <div className="card-warm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tinto/12 text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Folio</th>
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Artesano</th>
                  <th className="px-3 py-3 font-medium">Piezas</th>
                  <th className="px-3 py-3 font-medium">Destino</th>
                  <th className="px-3 py-3 font-medium">Estatus</th>
                  <th className="px-4 py-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const acciones = accionesDesde(p.estado);
                  const info = ESTADO_INFO[p.estado];
                  const abierto = editando?.id === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr className="border-t border-tinto/10 align-top hover:bg-tinto/[0.02]">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {p.orderId.replace(/^ord_/, "").slice(0, 8)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{fecha(p.createdAt)}</td>
                        <td className="px-3 py-3">
                          <span className="text-foreground">{p.artesano}</span>
                          {p.compradorEmail ? (
                            <span className="block text-xs text-muted-foreground">{p.compradorEmail}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{p.piezas}</td>
                        <td className="px-3 py-3 text-muted-foreground">{p.destinoCiudad ?? "—"}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: info.color }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
                            {info.corto}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            {acciones.map((a) =>
                              a.requiereGuia ? (
                                <button key={a.estado} type="button" onClick={() => setEditando({ id: p.id, tipo: "enviar" })} className="rounded-ob-sm bg-tinto px-2.5 py-1 text-xs font-semibold text-[#f7f1e6] hover:bg-[#6b2a23]">
                                  {a.label}
                                </button>
                              ) : a.destructiva ? (
                                <button key={a.estado} type="button" onClick={() => setEditando({ id: p.id, tipo: "cancelar" })} className="rounded-ob-sm px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-destructive">
                                  {a.label}
                                </button>
                              ) : (
                                <button key={a.estado} type="button" disabled={pending} onClick={() => run(p, a.estado)} className="rounded-ob-sm bg-tinto px-2.5 py-1 text-xs font-semibold text-[#f7f1e6] hover:bg-[#6b2a23] disabled:opacity-50">
                                  {a.label}
                                </button>
                              ),
                            )}
                            {acciones.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : null}
                          </div>
                        </td>
                      </tr>
                      {abierto ? (
                        <tr key={p.id + "-edit"} className="bg-tinto/[0.02]">
                          <td colSpan={7} className="px-4 py-3">
                            {editando!.tipo === "enviar" ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input value={paqueteria} onChange={(e) => setPaqueteria(e.target.value)} placeholder="Paquetería" className="rounded-ob-sm border border-tinto/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-tinto" />
                                <input value={guia} onChange={(e) => setGuia(e.target.value)} placeholder="Guía *" className="rounded-ob-sm border border-tinto/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-tinto" />
                                <button type="button" disabled={pending} onClick={() => run(p, "enviado", { paqueteria, guia })} className="rounded-ob-sm bg-tinto px-3 py-1.5 text-xs font-semibold text-[#f7f1e6] hover:bg-[#6b2a23] disabled:opacity-50">
                                  {pending ? "…" : "Confirmar envío"}
                                </button>
                                <button type="button" onClick={() => setEditando(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de cancelación" className="min-w-[240px] flex-1 rounded-ob-sm border border-tinto/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-tinto" />
                                <button type="button" disabled={pending} onClick={() => run(p, "cancelado", { nota: motivo })} className="rounded-ob-sm border border-destructive/50 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                                  {pending ? "…" : "Cancelar pedido"}
                                </button>
                                <button type="button" onClick={() => setEditando(null)} className="text-xs text-muted-foreground hover:text-foreground">Volver</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                      {error?.id === p.id ? (
                        <tr key={p.id + "-err"}>
                          <td colSpan={7} className="px-4 pb-3">
                            <p className="rounded-ob-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error.msg}</p>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
