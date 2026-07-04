import * as React from "react";
import { cn } from "@/lib/utils";

// Switch "Manos": apagado = arena con borde; encendido = jade. Presentacional: úsalo como
// type="submit" dentro de un <form action={...}> para alternar vía server action.
export function Interruptor({
  checked,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { checked: boolean }) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none",
        checked ? "bg-jade" : "border border-linea bg-arena",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-lino shadow-pieza transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
