"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { actualizarMarketing, eliminarCuenta } from "@/app/cuenta/actions";
import { Boton, botonCls } from "@/components/ui/boton";
import { Interruptor } from "@/components/ui/interruptor";
import type { ActionState } from "@/lib/admin/types";

function fecha(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function PrivacidadPanel({
  marketing,
  marketingAt,
}: {
  marketing: boolean;
  marketingAt: string | null;
}) {
  const [delState, delAction, delPending] = useActionState<ActionState, FormData>(eliminarCuenta, {});
  const [zona, setZona] = useState(false);
  const desde = fecha(marketingAt);

  return (
    <div className="max-w-xl space-y-4">
      {/* Comunicaciones */}
      <section className="rounded-[16px] border border-linea bg-lino p-5 shadow-pieza">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ceniza">Comunicaciones</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-tinta">Novedades y ediciones de talleres por correo</p>
            <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-ceniza">
              {marketing ? (desde ? `Activado el ${desde}` : "Activado") : "Desactivado"} · puedes cambiarlo cuando quieras
            </p>
          </div>
          <form action={actualizarMarketing}>
            <input type="hidden" name="valor" value={marketing ? "off" : "on"} />
            <Interruptor checked={marketing} aria-label="Novedades por correo" />
          </form>
        </div>
      </section>

      {/* Tus datos */}
      <section className="rounded-[16px] border border-linea bg-lino p-5 shadow-pieza">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ceniza">Tus datos</p>
        <p className="mt-2 flex items-start gap-2 text-sm text-ceniza">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 shrink-0 text-anil" aria-hidden><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          Perfil, direcciones y consentimientos. Tus tarjetas viven en Stripe y nunca las guardamos aquí.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a href="/cuenta/datos" className={botonCls({ variant: "outline", size: "sm", pill: true })}>
            Descargar mis datos (JSON)
          </a>
          <Link href="/aviso-de-privacidad" className="text-sm text-grana underline decoration-grana/40 underline-offset-4 hover:decoration-grana">
            Aviso de Privacidad
          </Link>
        </div>
      </section>

      {/* Eliminar cuenta */}
      <section className="rounded-[16px] border border-linea bg-lino p-5 shadow-pieza">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-destructive">Eliminar cuenta</p>
        {!zona ? (
          <>
            <p className="mt-2 text-sm text-ceniza">
              Es permanente. Bloqueamos tus datos de inmediato y los suprimimos al vencer los plazos legales.
            </p>
            <button
              type="button"
              onClick={() => setZona(true)}
              className="mt-3 text-sm text-destructive underline decoration-destructive/40 underline-offset-4 hover:decoration-destructive"
            >
              Eliminar mi cuenta
            </button>
          </>
        ) : (
          <form action={delAction} className="mt-3 space-y-3">
            {delState.message ? (
              <p className="rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                {delState.message}
              </p>
            ) : null}
            <p className="text-sm text-tinta">
              Escribe <strong>ELIMINAR</strong> para confirmar.
            </p>
            <input
              name="confirmar"
              autoComplete="off"
              placeholder="ELIMINAR"
              className="w-full max-w-xs rounded-[12px] border border-destructive/40 bg-lino px-3.5 py-2.5 text-tinta placeholder:text-ceniza/60 focus:border-destructive focus:outline-none"
            />
            <div className="flex items-center gap-4">
              <Boton type="submit" variant="danger" size="sm" pill disabled={delPending}>
                {delPending ? "Eliminando…" : "Eliminar definitivamente"}
              </Boton>
              <button type="button" onClick={() => setZona(false)} className="text-sm text-ceniza transition-colors hover:text-tinta">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
