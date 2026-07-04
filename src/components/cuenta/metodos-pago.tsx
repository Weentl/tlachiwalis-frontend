"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  listarMetodosPago,
  eliminarMetodoPago,
  hacerMetodoPredeterminado,
} from "@/app/cuenta/pagos-actions";
import { PaymentMethodCard } from "./payment-method-card";
import { Skeleton } from "@/components/ui/skeleton";
import { botonCls } from "@/components/ui/boton";
import type { MetodoPago } from "@/lib/comprador/pagos";

export function MetodosPago() {
  const [metodos, setMetodos] = useState<MetodoPago[] | null>(null);
  const [pending, start] = useTransition();

  const cargar = () => listarMetodosPago().then(setMetodos);
  useEffect(() => {
    cargar();
  }, []);

  const quitar = (id: string) =>
    start(async () => {
      await eliminarMetodoPago(id);
      await cargar();
    });
  const predeterminar = (id: string) =>
    start(async () => {
      await hacerMetodoPredeterminado(id);
      await cargar();
    });

  return (
    <div className="max-w-xl space-y-4">
      {metodos === null ? (
        <div className="space-y-3">
          <Skeleton className="h-[74px] w-full rounded-[16px]" />
          <Skeleton className="h-[74px] w-full rounded-[16px]" />
        </div>
      ) : metodos.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-linea bg-lino/60 p-6 text-center">
          <p className="text-tinta">Aún no has guardado tarjetas.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ceniza">
            Guarda una tarjeta para pagar más rápido. El número lo protege Stripe; no se guarda aquí.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {metodos.map((m) => (
            <PaymentMethodCard
              key={m.id}
              m={m}
              onQuitar={quitar}
              onPredeterminar={predeterminar}
              pending={pending}
            />
          ))}
        </ul>
      )}

      <Link
        href="/cuenta/metodos-de-pago/agregar"
        className={botonCls({ variant: "outline", size: "md", pill: true })}
      >
        + Agregar tarjeta
      </Link>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ceniza">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 shrink-0 text-anil" aria-hidden><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        Tus tarjetas se guardan de forma segura con Stripe (cifrado). El número de tu tarjeta nunca
        pasa por Tlachiwalis.
      </p>
    </div>
  );
}
