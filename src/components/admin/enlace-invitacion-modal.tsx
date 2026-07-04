"use client";
import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Modal del enlace de invitación (en claro, una sola vez). El admin lo COPIA y lo manda
 * a mano. Al cerrar se queda en la página de artesanos (por eso no hay "ir a artesanos").
 */
export function EnlaceInvitacionModal({
  link,
  onClose,
}: {
  link: string;
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="card-warm w-full max-w-md p-6" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-grotesk text-base font-semibold text-foreground">
            Enlace de invitación
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Cópialo y mándaselo al artesano. Caduca en 7 días y es de un solo uso; por
          seguridad no se vuelve a mostrar (si lo pierdes, genera otro).
        </p>

        <div className="mt-4 rounded-ob-sm border border-tinto/20 bg-background px-3 py-2">
          <span className="block truncate font-mono text-xs text-foreground">{link}</span>
        </div>

        <Button type="button" onClick={copiar} className="mt-3 w-full">
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiado" : "Copiar enlace"}
        </Button>
      </div>
    </div>
  );
}
