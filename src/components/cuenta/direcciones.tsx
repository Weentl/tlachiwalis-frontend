"use client";
import { useActionState, useEffect, useState } from "react";
import { agregarDireccion, eliminarDireccion, hacerPrincipal } from "@/app/cuenta/actions";
import { Boton } from "@/components/ui/boton";
import { Campo } from "./campo";
import type { ActionState } from "@/lib/admin/types";
import type { Direccion } from "@/lib/comprador/perfil";

export function Direcciones({ direcciones }: { direcciones: Direccion[] }) {
  const [abierto, setAbierto] = useState(direcciones.length === 0);
  const [state, action, pending] = useActionState<ActionState, FormData>(agregarDireccion, {});
  const e = (f: string) => state.errors?.[f]?.[0];

  useEffect(() => {
    if (state.ok) setAbierto(false);
  }, [state.ok]);

  return (
    <div className="space-y-6">
      {direcciones.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {direcciones.map((d) => (
            <li
              key={d.id}
              className="flex flex-col rounded-[16px] border border-linea bg-lino p-4 shadow-pieza"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-arena px-2.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-tinta">
                  {d.etiqueta || "Dirección"}
                </span>
                {d.esPrincipal ? (
                  <span className="rounded-full bg-jade/12 px-2.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-jade">
                    Predeterminada
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-tinta">{d.calle}</p>
              <p className="text-sm text-ceniza">
                {[d.colonia, d.ciudad, d.estado, d.cp].filter(Boolean).join(", ")}
              </p>
              {d.destinatario ? (
                <p className="mt-1 text-sm text-ceniza">Para {d.destinatario}</p>
              ) : null}
              <div className="mt-auto flex items-center gap-4 pt-3">
                {!d.esPrincipal ? (
                  <form action={hacerPrincipal}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="text-xs text-tinta underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
                    >
                      Hacer predeterminada
                    </button>
                  </form>
                ) : null}
                <form action={eliminarDireccion}>
                  <input type="hidden" name="id" value={d.id} />
                  <button
                    type="submit"
                    className="text-xs text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[16px] border border-dashed border-linea bg-lino/60 p-6 text-center">
          <p className="text-tinta">Aún no has guardado direcciones.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ceniza">
            Agrega una para que tu primera pieza llegue sin fricción.
          </p>
        </div>
      )}

      {abierto ? (
        <form action={action} className="space-y-4 rounded-[16px] border border-linea bg-lino p-5">
          {state.message ? (
            <p className="rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              {state.message}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Etiqueta (Casa, Oficina)" name="etiqueta" error={e("etiqueta")} />
            <Campo label="Destinatario" name="destinatario" error={e("destinatario")} />
            <Campo label="Calle y número" name="calle" required error={e("calle")} />
            <Campo label="Colonia" name="colonia" error={e("colonia")} />
            <Campo label="Ciudad" name="ciudad" required error={e("ciudad")} />
            <Campo label="Estado" name="estado" error={e("estado")} />
            <Campo label="C.P." name="cp" error={e("cp")} />
            <Campo label="Teléfono" name="telefono" type="tel" error={e("telefono")} />
          </div>
          <Campo label="Referencias (opcional)" name="referencias" error={e("referencias")} />
          <div className="flex items-center gap-4">
            <Boton type="submit" disabled={pending} pill>
              {pending ? "Guardando…" : "Guardar dirección"}
            </Boton>
            {direcciones.length > 0 ? (
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-sm text-ceniza transition-colors hover:text-tinta"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <Boton type="button" variant="outline" pill onClick={() => setAbierto(true)}>
          + Agregar una dirección
        </Boton>
      )}
    </div>
  );
}
