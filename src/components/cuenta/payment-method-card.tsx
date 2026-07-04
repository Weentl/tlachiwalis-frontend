import { cn } from "@/lib/utils";
import type { MetodoPago } from "@/lib/comprador/pagos";

const BRAND: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function PaymentMethodCard({
  m,
  onQuitar,
  onPredeterminar,
  pending,
}: {
  m: MetodoPago;
  onQuitar: (id: string) => void;
  onPredeterminar: (id: string) => void;
  pending: boolean;
}) {
  const nombre = BRAND[m.brand] ?? m.brand.replace(/^\w/, (c) => c.toUpperCase());
  const exp = `${String(m.expMonth).padStart(2, "0")}/${String(m.expYear).slice(-2)}`;
  return (
    <li className="flex items-center gap-4 rounded-[16px] border border-linea bg-lino p-4 shadow-pieza">
      <div className="grid h-10 w-14 shrink-0 place-items-center rounded-[8px] bg-anil/10 text-anil">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-tinta">
          <span className="font-medium">{nombre}</span>
          <span className="font-mono text-sm tabular-nums text-ceniza">•••• {m.last4}</span>
          {m.isDefault ? (
            <span className="rounded-full bg-jade/12 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-jade">
              Predeterminada
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-ceniza">
          Vence {exp}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {!m.isDefault ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onPredeterminar(m.id)}
            className={cn(
              "text-xs text-tinta underline decoration-linea underline-offset-4 transition-colors hover:text-grana",
              pending && "opacity-50",
            )}
          >
            Predeterminar
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => onQuitar(m.id)}
          className={cn(
            "text-xs text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-grana",
            pending && "opacity-50",
          )}
        >
          Quitar
        </button>
      </div>
    </li>
  );
}
