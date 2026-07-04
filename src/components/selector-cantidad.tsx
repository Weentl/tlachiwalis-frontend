"use client";

// Stepper − n + redondeado (firma "Manos"). Controlado, clamp 1..max.
export function SelectorCantidad({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-linea">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Quitar uno"
        className="grid h-11 w-11 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60 disabled:opacity-30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
      </button>
      <span className="w-11 text-center text-base tabular-nums text-tinta">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Agregar uno"
        className="grid h-11 w-11 place-items-center rounded-full text-tinta transition-colors hover:bg-arena/60 disabled:opacity-30"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
