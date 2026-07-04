import { cn } from "@/lib/utils";

/* Hilo — firma "Manos": puntada grana. Divisor de sección de disciplina extrema
   (nada más lleva hilo). Decorativo → aria-hidden. */
export function Hilo({ className }: { className?: string }) {
  return <div aria-hidden className={cn("hilo w-full", className)} />;
}
