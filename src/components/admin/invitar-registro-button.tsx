"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  invitarRegistro,
  type InvitarState,
} from "@/app/admin/(panel)/artesanos/invitar-actions";
import { EnlaceInvitacionModal } from "@/components/admin/enlace-invitacion-modal";

// NUEVO MODELO (0013): el admin NO llena un formulario; solo genera un LINK de registro.
// El artesano abre el link y crea su cuenta + llena TODOS sus datos (registro autoguiado).
export function InvitarRegistroButton() {
  const [state, formAction, pending] = useActionState<InvitarState, FormData>(
    invitarRegistro,
    {},
  );
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.link) {
      setAbierto(true);
      router.refresh(); // que la nueva invitación aparezca en la lista de pendientes
    }
  }, [state.link, router]);

  return (
    <>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {pending ? "Generando…" : "Invitar artesano"}
        </button>
      </form>
      {abierto && state.link ? (
        <EnlaceInvitacionModal link={state.link} onClose={() => setAbierto(false)} />
      ) : null}
    </>
  );
}
