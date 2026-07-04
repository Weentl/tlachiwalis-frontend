import type { PerfilComprador } from "@/lib/comprador/perfil";

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Barra + checklist para motivar a completar el perfil (jade = logro). Desaparece al 100%.
export function PerfilProgreso({ perfil }: { perfil: PerfilComprador }) {
  const items = [
    { ok: !!perfil.nombre, label: "nombre" },
    { ok: !!perfil.apellido, label: "apellido" },
    { ok: !!perfil.telefono, label: "teléfono" },
    { ok: perfil.intereses.length > 0, label: "intereses" },
  ];
  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / items.length) * 100);

  if (pct === 100) {
    return (
      <div className="mt-5 border-t border-linea pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-jade/12 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-jade">
          <Check /> Perfil completo
        </span>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-linea pt-4">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ceniza">
        Perfil al {pct}%
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-arena">
        <div className="h-full rounded-full bg-jade transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-sm text-ceniza">
        Te falta poco — con tus intereses te recomendamos piezas de los oficios que amas.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) =>
          i.ok ? (
            <span key={i.label} className="inline-flex items-center gap-1 rounded-full bg-jade/12 px-2.5 py-1 text-xs text-jade">
              <Check /> {i.label}
            </span>
          ) : (
            <span key={i.label} className="rounded-full border border-linea px-2.5 py-1 text-xs text-grana">
              Agregar {i.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
