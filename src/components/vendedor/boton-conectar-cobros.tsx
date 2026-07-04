"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { iniciarOnboardingStripe } from "@/app/vendedor/(panel)/cobros/actions";

function Boton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23] disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Conectando…
        </>
      ) : (
        <>
          {label} <ArrowUpRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

/**
 * Botón que arranca (o continúa) el onboarding de cobros. Al enviar, la Server Action crea el
 * Account Link y redirige a la página HOSTED de Stripe (redirect() lanza NEXT_REDIRECT → no
 * hay estado de éxito que renderizar; solo se ve el error si Stripe/apps/api fallan).
 */
export function BotonConectarCobros({ label = "Conectar cobros con Stripe" }: { label?: string }) {
  const [state, action] = useActionState(iniciarOnboardingStripe, {});
  return (
    <form action={action}>
      <Boton label={label} />
      {state?.error ? <p className="mt-2 text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
