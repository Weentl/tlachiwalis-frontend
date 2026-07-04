"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Boton } from "@/components/ui/boton";

// La publishable key es pública (NEXT_PUBLIC). loadStripe se llama una sola vez a nivel módulo.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

// Usamos CardElement (NO PaymentElement): muestra SOLO los campos de la tarjeta —sin la caja de
// "Stripe Link" (correo/celular/nombre)— que el cliente pidió quitar. Tematizado con los tokens Manos.
const cardStyle = {
  style: {
    base: {
      color: "#211C15",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#8C7C68" },
      iconColor: "#B4324E",
    },
    invalid: { color: "#B4231C", iconColor: "#B4231C" },
  },
};

function InnerForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const card = elements?.getElement(CardElement);
    if (!stripe || !card) return;
    setPending(true);
    setError(null);
    // Guarda la tarjeta (SetupIntent → payment method adjunto al Customer).
    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });
    if (error) {
      setError(error.message ?? "No se pudo guardar la tarjeta.");
      setPending(false);
      return;
    }
    router.push("/cuenta");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-[12px] border border-linea bg-lino px-3.5 py-3.5 focus-within:border-grana">
        <CardElement options={cardStyle} />
      </div>
      {error ? (
        <p className="rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Boton type="submit" size="lg" pill disabled={!stripe || pending} className="w-full">
        {pending ? "Guardando…" : "Guardar tarjeta"}
      </Boton>
    </form>
  );
}

export function AddCardForm({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise}>
      <InnerForm clientSecret={clientSecret} />
    </Elements>
  );
}
