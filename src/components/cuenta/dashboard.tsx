"use client";
import { useState } from "react";
import Link from "next/link";
import { PerfilForm } from "./perfil-form";
import { Direcciones } from "./direcciones";
import { PrivacidadPanel } from "./privacidad-panel";
import { MetodosPago } from "./metodos-pago";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";
import type { PerfilComprador, Direccion } from "@/lib/comprador/perfil";

type SecId = "perfil" | "pedidos" | "direcciones" | "pagos" | "privacidad";
const SECCIONES: { id: SecId; label: string; kicker: string; sub: string }[] = [
  { id: "perfil", label: "Perfil", kicker: "Tu perfil", sub: "Tus datos y lo que te gusta." },
  { id: "pedidos", label: "Pedidos", kicker: "Tus pedidos", sub: "El camino de cada pieza hasta tu puerta." },
  { id: "direcciones", label: "Direcciones", kicker: "Direcciones", sub: "A dónde llegan tus piezas." },
  { id: "pagos", label: "Métodos de pago", kicker: "Métodos de pago", sub: "Tarjetas guardadas de forma segura con Stripe." },
  { id: "privacidad", label: "Privacidad y datos", kicker: "Privacidad y datos", sub: "Tú decides qué guardamos y qué te enviamos." },
];

export function CuentaDashboard({
  perfil,
  email,
  emailVerificado,
  miembroDesde,
  direcciones,
}: {
  perfil: PerfilComprador;
  email: string;
  emailVerificado: boolean;
  miembroDesde: string | null;
  direcciones: Direccion[];
}) {
  const [sec, setSec] = useState<SecId>("perfil");
  const actual = SECCIONES.find((s) => s.id === sec)!;

  return (
    <div className="mt-10 grid gap-8 md:grid-cols-[14rem_1fr]">
      {/* Nav: sin bloque oscuro. Activo = puntada grana (.hilo) + aria-current. */}
      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-linea md:h-fit md:flex-col md:gap-0.5 md:border-b-0 md:border-r md:pr-6">
        {SECCIONES.map((s) => {
          const active = sec === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSec(s.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "relative shrink-0 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-left text-sm transition-colors",
                active ? "font-medium text-tinta" : "text-ceniza hover:bg-arena/50 hover:text-tinta",
              )}
            >
              {s.label}
              {active ? <span className="hilo absolute -bottom-px left-4 right-4" /> : null}
            </button>
          );
        })}
      </nav>

      {/* Sección activa */}
      <section>
        <div className="mb-6">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ceniza">{actual.kicker}</p>
          <h2 className="mt-1 font-display text-2xl text-tinta">{actual.label}</h2>
          <p className="mt-1 text-sm text-ceniza">{actual.sub}</p>
        </div>

        {sec === "perfil" ? (
          <PerfilForm perfil={perfil} email={email} emailVerificado={emailVerificado} miembroDesde={miembroDesde} />
        ) : null}

        {sec === "pedidos" ? (
          <div className="max-w-xl rounded-[16px] border border-dashed border-linea bg-lino/60 p-8 text-center">
            <p className="text-tinta">Aún no hay pedidos por aquí.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ceniza">
              Cuando compres tu primera pieza, verás su camino desde el taller hasta tu puerta.
            </p>
            <Link href="/tienda" className={cn(botonCls({ size: "lg", pill: true }), "mt-5")}>
              Explorar la tienda
            </Link>
            {perfil.intereses.length > 0 ? (
              <p className="mt-4">
                <Link
                  href={`/tienda?oficio=${encodeURIComponent(perfil.intereses[0])}`}
                  className="text-sm text-grana underline decoration-grana/40 underline-offset-4 hover:decoration-grana"
                >
                  Ver piezas de {perfil.intereses.slice(0, 2).join(" y ")} →
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {sec === "direcciones" ? <Direcciones direcciones={direcciones} /> : null}
        {sec === "pagos" ? <MetodosPago /> : null}
        {sec === "privacidad" ? (
          <PrivacidadPanel marketing={perfil.marketingConsent} marketingAt={perfil.marketingConsentAt} />
        ) : null}
      </section>
    </div>
  );
}
