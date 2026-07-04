"use client";
import { useActionState, useEffect, useState } from "react";
import {
  invitarArtesano,
  type InvitarState,
} from "@/app/admin/(panel)/artesanos/invitar-actions";
import { EnlaceInvitacionModal } from "@/components/admin/enlace-invitacion-modal";

/**
 * Botón compacto para (re)generar el enlace de un artesano existente (p.ej. 2º taller)
 * y mostrarlo en el modal. En el modelo nuevo el alta normal ya no usa esto.
 */
export function InvitarRapido({ artesanoId }: { artesanoId: string }) {
  const [state, formAction, pending] = useActionState<InvitarState, FormData>(
    invitarArtesano,
    {},
  );
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (state.link) setAbierto(true);
  }, [state.link]);

  return (
    <>
      <form action={formAction} className="inline">
        <input type="hidden" name="artesano_id" value={artesanoId} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-medium text-tinto transition-colors hover:underline disabled:opacity-50"
        >
          {pending ? "Generando…" : "Enviar enlace"}
        </button>
      </form>
      {abierto && state.link ? (
        <EnlaceInvitacionModal link={state.link} onClose={() => setAbierto(false)} />
      ) : null}
    </>
  );
}
