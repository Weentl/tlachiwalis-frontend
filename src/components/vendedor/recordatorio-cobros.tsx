"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Clock } from "lucide-react";

/**
 * Recordatorio PERSISTENTE de cobros (Fase 4). Se muestra en TODO el panel del vendedor
 * mientras no tenga cobros habilitados — el cliente lo pidió explícitamente: "si se salta el
 * onboarding recuérdale en la página SIEMPRE que debe de hacerlo". Se oculta solo si ya está
 * habilitado o si ya estás en la propia página de cobros (evita duplicar el mensaje ahí).
 */
export function RecordatorioCobros({
  habilitado,
  detallesEnviados,
}: {
  habilitado: boolean;
  detallesEnviados: boolean;
}) {
  const pathname = usePathname();
  if (habilitado) return null;
  if (pathname?.startsWith("/vendedor/cobros")) return null;

  // details_submitted pero aún no habilitado → está en revisión de Stripe (no es "acción faltante").
  const enRevision = detallesEnviados;

  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-6 py-2.5 text-xs " +
        (enRevision
          ? "border-amber-300/40 bg-amber-50 text-amber-900"
          : "border-destructive/25 bg-destructive/[0.04] text-foreground")
      }
    >
      {enRevision ? (
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
      )}
      <span className="font-medium">
        {enRevision
          ? "Stripe está revisando tus datos de cobro. Aún no puedes publicar piezas."
          : "Aún no puedes vender: completa tu conexión de cobros para poder publicar tus piezas."}
      </span>
      <Link
        href="/vendedor/cobros"
        className="ml-auto inline-flex items-center gap-1 font-semibold text-tinto hover:underline"
      >
        {enRevision ? "Ver estado" : "Conectar cobros"}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
