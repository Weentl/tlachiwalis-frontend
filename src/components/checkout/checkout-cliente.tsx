"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCart } from "@/lib/cart";
import { formatMXN } from "@/lib/products";
import { Boton, botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";
import { iniciarCheckout, confirmarOrden } from "@/app/checkout/actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

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

function Inner() {
  const { items, total, count, clear } = useCart();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl text-tinta">Tu carrito está vacío</p>
        <Link href="/tienda" className={cn(botonCls({ size: "lg", pill: true }), "mt-6")}>
          Ver la tienda
        </Link>
      </div>
    );
  }

  const pagar = async (e: React.FormEvent) => {
    e.preventDefault();
    const card = elements?.getElement(CardElement);
    if (!stripe || !card) return;
    setPending(true);
    setError(null);

    const payload = items
      .filter((i) => i.variante?.id)
      .map((i) => ({ productoId: i.product.id, varianteId: i.variante!.id, cantidad: i.qty }));
    if (payload.length === 0) {
      setError("Tu carrito no tiene piezas válidas. Vuelve a agregarlas.");
      setPending(false);
      return;
    }

    const ini = await iniciarCheckout(payload);
    if (!ini.ok) {
      setError(ini.error);
      setPending(false);
      return;
    }

    const { error: perr, paymentIntent } = await stripe.confirmCardPayment(ini.clientSecret, {
      payment_method: { card },
    });
    if (perr) {
      setError(perr.message ?? "No se pudo procesar el pago.");
      setPending(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      await confirmarOrden(paymentIntent.id);
      clear();
      router.push(`/checkout/gracias?order=${ini.orderId}`);
      return;
    }
    setError("El pago no se completó. Intenta de nuevo.");
    setPending(false);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      {/* Pago */}
      <form onSubmit={pagar} className="order-2 lg:order-1">
        <h2 className="font-display text-2xl text-tinta">Pago</h2>
        <p className="mt-1 text-sm text-ceniza">
          Ingresa los datos de tu tarjeta. El pago lo procesa Stripe; el número nunca se guarda aquí.
        </p>
        <div className="mt-5 rounded-[12px] border border-linea bg-lino px-3.5 py-3.5 focus-within:border-grana">
          <CardElement options={cardStyle} />
        </div>
        {error ? (
          <p className="mt-4 rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Boton type="submit" size="lg" pill disabled={!stripe || pending} className="mt-5 w-full">
          {pending ? "Procesando…" : `Pagar ${formatMXN(total)} MXN`}
        </Boton>
        <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ceniza">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-anil" aria-hidden><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          Pago seguro con Stripe
        </p>
        <p className="mt-3 text-center text-xs text-ceniza">Prueba: 4242 4242 4242 4242 · fecha futura · CVC 123</p>
      </form>

      {/* Resumen */}
      <aside className="order-1 lg:order-2">
        <div className="rounded-[20px] border border-linea bg-lino p-5 shadow-pieza">
          <h2 className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Tu pedido</h2>
          <ul className="mt-4 divide-y divide-linea">
            {items.map((item) => {
              const precio = item.variante?.precio ?? item.product.precio;
              const op = item.variante ? Object.values(item.variante.opciones).join(" · ") : "";
              return (
                <li key={item.key} className="flex gap-3 py-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[10px] bg-arena">
                    <Image src={item.product.img} alt={item.product.nombre} fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-tinta">{item.product.nombre}</p>
                    {op ? <p className="font-mono text-[0.6rem] uppercase tracking-wide text-ceniza">{op}</p> : null}
                    <p className="text-xs text-ceniza">Cantidad: {item.qty}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-tinta">{formatMXN(precio * item.qty)}</p>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-linea pt-4">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Total</span>
            <span className="font-display text-2xl tabular-nums text-tinta">
              {formatMXN(total)}
              <span className="ml-1 align-middle font-sans text-sm text-ceniza">MXN</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-ceniza">
            Le compras directo a los talleres. El envío se coordina tras la compra.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function CheckoutCliente() {
  return (
    <Elements stripe={stripePromise}>
      <Inner />
    </Elements>
  );
}
