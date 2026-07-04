"use client";
import * as React from "react";
import { useActionState } from "react";
import { Check, Copy, Link2, MessageCircle, Send } from "lucide-react";
import {
  invitarArtesano,
  type InvitarState,
} from "@/app/admin/(panel)/artesanos/invitar-actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/admin/fields";

/**
 * Botón/UI de "Invitar artesano" para la ficha del admin. Genera el link
 * `/unirse?t=...` (Server Action) y lo muestra para copiar o compartir por
 * WhatsApp. El link no se vuelve a poder recuperar: el admin lo copia ahora.
 *
 * `artesanoNombre` es solo para el mensaje de WhatsApp; el vínculo real lo hace
 * el token, no el nombre.
 */
export function InvitarButton({
  artesanoId,
  artesanoNombre,
  yaVinculado = false,
}: {
  artesanoId: string;
  artesanoNombre: string;
  yaVinculado?: boolean;
}) {
  const [state, action, pending] = useActionState<InvitarState, FormData>(
    invitarArtesano,
    {},
  );
  const [copiado, setCopiado] = React.useState(false);

  async function copiar(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  if (yaVinculado) {
    return (
      <div className="card-warm p-5">
        <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Acceso del artesano
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este artesano ya tiene una cuenta vinculada y puede entrar a su panel.
        </p>
      </div>
    );
  }

  const link = state.link;
  const mensajeWa = link
    ? `Hola ${artesanoNombre}, te invito a Tlachiwalis. Entra a este enlace para crear tu cuenta y publicar tus piezas (caduca en 7 días): ${link}`
    : "";
  const waHref = link
    ? `https://wa.me/?text=${encodeURIComponent(mensajeWa)}`
    : "#";

  return (
    <div className="card-warm p-5">
      <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
        Invitar a su panel
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Genera un enlace de un solo uso para que el artesano cree su acceso y
        administre sus piezas. Compártelo por WhatsApp; caduca en 7 días.
      </p>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="artesano_id" value={artesanoId} />

        <TextField
          label="Correo (opcional)"
          name="email"
          type="email"
          placeholder="para tu referencia"
          hint="No enviamos correo. El enlace se comparte por WhatsApp; el correo es solo una nota tuya."
          error={state.errors?.email?.[0]}
        />

        {state.message && !state.ok ? (
          <p
            className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            aria-live="polite"
          >
            {state.message}
          </p>
        ) : null}

        <Button type="submit" variant="outline" disabled={pending}>
          <Send className="h-4 w-4" />
          {pending ? "Generando…" : link ? "Generar otro enlace" : "Generar enlace de invitación"}
        </Button>
      </form>

      {link ? (
        <div className="mt-4 space-y-3 border-t border-tinto/12 pt-4" aria-live="polite">
          <p className="text-sm font-medium text-foreground">{state.message}</p>

          <div className="flex items-center gap-2 rounded-ob-sm border border-tinto/20 bg-background px-3 py-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {link}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => copiar(link)}>
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? "Copiado" : "Copiar enlace"}
            </Button>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
            >
              <MessageCircle className="h-4 w-4" />
              Compartir por WhatsApp
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            Guarda este enlace ahora: por seguridad no se puede volver a mostrar.
            Genera otro si lo pierdes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
