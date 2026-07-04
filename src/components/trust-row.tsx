import { cn } from "@/lib/utils";

/* TrustRow — señales de confianza (directo del taller · pago seguro · envío).
   Eyebrow mono + una línea de apoyo. Íconos de trazo fino. Server component. */

type Señal = { titulo: string; apoyo: string; icon: React.ReactNode };

const señales: Señal[] = [
  {
    titulo: "Directo del taller",
    apoyo: "Sin intermediarios: le compras a quien la hizo.",
    icon: (
      <path d="M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5" />
    ),
  },
  {
    titulo: "Pago seguro",
    apoyo: "Procesado con cifrado. Tu tarjeta nunca se guarda aquí.",
    icon: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    titulo: "Envío a todo México",
    apoyo: "Empaque cuidado y guía de rastreo en cada pedido.",
    icon: (
      <>
        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
        <circle cx="7" cy="17" r="1.6" />
        <circle cx="17" cy="17" r="1.6" />
      </>
    ),
  },
];

export function TrustRow({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid gap-8 sm:grid-cols-3",
        className,
      )}
    >
      {señales.map((s) => (
        <li key={s.titulo} className="flex items-start gap-3.5">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-grana"
            aria-hidden
          >
            {s.icon}
          </svg>
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-tinta">
              {s.titulo}
            </p>
            <p className="mt-1 text-sm leading-snug text-ceniza">{s.apoyo}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
