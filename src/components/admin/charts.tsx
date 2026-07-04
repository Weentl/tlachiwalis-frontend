import { fmtPesos, type Serie } from "@/lib/admin/metrics";

const TINTO = "#57211d";
const BARRO = "#b45f39";

// Barras verticales con gradiente (ventas por mes).
export function BarChart({
  meses,
  valores,
}: {
  meses: string[];
  valores: number[];
}) {
  const max = Math.max(1, ...valores);
  return (
    <div>
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {valores.map((v, i) => {
          const top = i === valores.length - 1; // mes actual destacado en barro
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${meses[i]}: ${fmtPesos(v)}`}
            >
              <div
                className="w-full rounded-t-[6px] transition-all"
                style={{
                  height: `${Math.max(3, (v / max) * 100)}%`,
                  background: top
                    ? "linear-gradient(180deg, #b45f39, rgba(180,95,57,0.18))"
                    : "linear-gradient(180deg, #57211d, rgba(87,33,29,0.14))",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {meses.map((m, i) => (
          <span
            key={i}
            className="flex-1 text-center text-xs text-muted-foreground"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// Dona / anillo (SVG): composición de un total.
export function Donut({
  data,
  size = 168,
  thickness = 20,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(87,33,29,0.08)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const dash = (d.value / total) * circ;
        const node = (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, dash - 2)} ${circ - Math.max(0, dash - 2)}`}
            strokeDashoffset={-acc}
            transform={`rotate(-90 ${c} ${c})`}
          />
        );
        acc += dash;
        return node;
      })}
    </svg>
  );
}

// Barras horizontales (rankings) con gradiente.
export function HBars({
  data,
  format = fmtPesos,
}: {
  data: Serie[];
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-foreground">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {format(d.value)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-tinto/8">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: `linear-gradient(90deg, rgba(87,33,29,0.45), ${TINTO})`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Barra apilada + leyenda (distribución por categoría).
export function StackedBar({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-tinto/8">
        {data.map((d, i) =>
          d.value > 0 ? (
            <div
              key={i}
              style={{ width: `${(d.value / total) * 100}%`, background: d.color }}
              title={`${d.label}: ${d.value}`}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="tabular-nums text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
