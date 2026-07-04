"use client";
import { useState } from "react";
import { fmtPesos, type Serie } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";

type Periodo = "semana" | "mes" | "anio";
const TABS: { k: Periodo; label: string }[] = [
  { k: "semana", label: "Semana" },
  { k: "mes", label: "Mes" },
  { k: "anio", label: "Año" },
];
const TOTAL_LABEL: Record<Periodo, string> = {
  semana: "Total · 12 semanas",
  mes: "Total · 12 meses",
  anio: "Total · 4 años",
};

export function SalesChart({
  series,
}: {
  series: { semana: Serie[]; mes: Serie[]; anio: Serie[] };
}) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [hover, setHover] = useState<number | null>(null);

  const data = series[periodo];
  const idx = hover ?? data.length - 1; // por defecto, el periodo actual
  const sel = data[idx];
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-grotesk text-base font-semibold text-foreground">
            Ventas
          </h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-grotesk text-2xl font-bold tabular-nums text-foreground">
              {fmtPesos(sel?.value ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground">{sel?.label}</span>
          </p>
        </div>
        <div className="flex shrink-0 rounded-ob-sm border border-tinto/15 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => {
                setPeriodo(t.k);
                setHover(null);
              }}
              className={cn(
                "rounded-[9px] px-3 py-1 text-xs font-medium transition-colors",
                periodo === t.k
                  ? "bg-tinto text-[#f7f1e6]"
                  : "text-muted-foreground hover:text-tinto",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-44 items-end gap-1.5">
        {data.map((d, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            className="flex h-full flex-1 flex-col justify-end outline-none"
            aria-label={`${d.label}: ${fmtPesos(d.value)}`}
          >
            <div
              className="w-full rounded-t-[5px] transition-all"
              style={{
                height: `${Math.max(2, (d.value / max) * 100)}%`,
                background:
                  i === idx
                    ? "linear-gradient(180deg, #b45f39, rgba(180,95,57,0.22))"
                    : "linear-gradient(180deg, #57211d, rgba(87,33,29,0.16))",
              }}
            />
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 truncate text-center text-[0.65rem]",
              i === idx ? "font-medium text-tinto" : "text-muted-foreground",
            )}
          >
            {d.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-tinto/10 pt-3 text-xs text-muted-foreground">
        <span>{TOTAL_LABEL[periodo]}</span>
        <span className="font-semibold tabular-nums text-foreground">
          {fmtPesos(total)}
        </span>
      </div>
    </div>
  );
}
