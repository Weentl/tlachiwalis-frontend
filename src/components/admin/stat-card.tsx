import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = "#57211d",
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon?: ReactNode;
  color?: string;
}) {
  return (
    <div className="card-warm card-warm-hover p-5">
      <div className="flex items-start justify-between gap-2">
        {icon ? (
          <span
            className="grid h-9 w-9 place-items-center rounded-ob-sm"
            style={{ background: `${color}14`, color }}
          >
            {icon}
          </span>
        ) : (
          <span />
        )}
        {sub ? <span className="text-xs">{sub}</span> : null}
      </div>
      <p className="mt-4 font-grotesk text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-xs uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
