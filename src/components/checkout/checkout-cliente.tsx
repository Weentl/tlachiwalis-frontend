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
import {
  iniciarCheckout,
  confirmarOrden,
  agregarDireccionCheckout,
  type FacturacionCheckout,
} from "@/app/checkout/actions";
import { guardarFacturacion } from "@/app/cuenta/facturacion-actions";
import { REGIMENES_FISCALES, USOS_CFDI } from "@/lib/comprador/facturacion-catalogos";
import type { Direccion } from "@/lib/comprador/perfil";
import type { MetodoPago } from "@/lib/comprador/pagos";
import type { PerfilFacturacion } from "@/lib/comprador/facturacion";

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

const BRAND: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

function resumenDir(d: Direccion): string {
  return [d.calle, d.colonia, d.ciudad, d.estado, d.cp].filter(Boolean).join(", ");
}

// Campo de texto Manos, controlado.
function Campo({
  label,
  value,
  onChange,
  required,
  placeholder,
  className,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">
        {label}
        {required ? <span className="text-grana"> *</span> : null}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-[12px] border border-linea bg-lino px-3.5 py-2.5 text-tinta outline-none transition-colors placeholder:text-ceniza/60 focus:border-grana"
      />
    </label>
  );
}

// Encabezado de un paso del acordeón (número, título, resumen colapsado + "Cambiar").
function PasoHeader({
  n,
  titulo,
  activo,
  completado,
  resumen,
  onEditar,
}: {
  n: number;
  titulo: string;
  activo: boolean;
  completado: boolean;
  resumen?: string;
  onEditar?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs",
          activo || completado ? "bg-grana text-cal" : "bg-arena text-ceniza",
        )}
      >
        {completado && !activo ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className={cn("font-display text-lg leading-none", activo ? "text-tinta" : "text-ceniza")}>
          {titulo}
        </h2>
        {completado && !activo && resumen ? (
          <p className="mt-1 truncate text-sm text-ceniza">{resumen}</p>
        ) : null}
      </div>
      {completado && !activo && onEditar ? (
        <button
          type="button"
          onClick={onEditar}
          className="shrink-0 text-xs text-tinta underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
        >
          Cambiar
        </button>
      ) : null}
    </div>
  );
}

function Inner({
  direcciones,
  tarjetas,
  factura,
  nombreSugerido,
  telefonoSugerido,
  emailUsuario,
}: Props) {
  const { items, total, count, clear } = useCart();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [paso, setPaso] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ck_${Date.now()}`,
  );

  // Envío
  const [dirs, setDirs] = useState<Direccion[]>(direcciones);
  const [dirId, setDirId] = useState<string>(
    direcciones.find((d) => d.esPrincipal)?.id ?? direcciones[0]?.id ?? "",
  );
  const [agregando, setAgregando] = useState(direcciones.length === 0);
  const [nueva, setNueva] = useState({
    etiqueta: "",
    destinatario: nombreSugerido,
    telefono: telefonoSugerido,
    calle: "",
    colonia: "",
    ciudad: "",
    estado: "",
    cp: "",
    referencias: "",
  });
  const [guardandoDir, setGuardandoDir] = useState(false);
  const [errDir, setErrDir] = useState<string | null>(null);

  // Pago
  const [metodoSel, setMetodoSel] = useState<string>(
    tarjetas.find((t) => t.isDefault)?.id ?? tarjetas[0]?.id ?? "nueva",
  );
  const [guardarTarjeta, setGuardarTarjeta] = useState(true);

  // Facturación
  const [quiereFactura, setQuiereFactura] = useState(false);
  const [fac, setFac] = useState<PerfilFacturacion>(factura);
  const [guardarFactura, setGuardarFactura] = useState(true);

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

  const dirActual = dirs.find((d) => d.id === dirId) ?? null;
  const metodoActual = tarjetas.find((t) => t.id === metodoSel) ?? null;
  const setFacField = (k: keyof PerfilFacturacion) => (v: string) => setFac((f) => ({ ...f, [k]: v }));

  const guardarNuevaDireccion = async () => {
    setErrDir(null);
    setGuardandoDir(true);
    const r = await agregarDireccionCheckout(nueva);
    setGuardandoDir(false);
    if (!r.ok) {
      setErrDir(r.error);
      return;
    }
    setDirs((prev) => [...prev, r.direccion]);
    setDirId(r.direccion.id);
    setAgregando(false);
  };

  const resumenMetodo = (m: MetodoPago) =>
    `${BRAND[m.brand] ?? m.brand} •••• ${m.last4}`;

  const pagar = async () => {
    if (!stripe) return;
    setError(null);

    if (!dirId) {
      setError("Elige o agrega una dirección de envío.");
      setPaso(1);
      return;
    }
    const usaNueva = metodoSel === "nueva";
    const card = usaNueva ? elements?.getElement(CardElement) : null;
    if (usaNueva && !card) {
      setError("Ingresa los datos de la tarjeta.");
      setPaso(2);
      return;
    }
    if (!usaNueva && !metodoSel) {
      setError("Elige una tarjeta.");
      setPaso(2);
      return;
    }

    // Facturación (opcional): valida RFC y arma el snapshot; guarda el perfil si se pidió.
    let facturacion: FacturacionCheckout | undefined;
    if (quiereFactura) {
      const rfc = fac.rfc.trim().toUpperCase();
      if (!/^[A-ZÑ&0-9]{12,13}$/.test(rfc)) {
        setError("Revisa tu RFC (12–13 caracteres).");
        return;
      }
      const email = fac.email.trim() || emailUsuario;
      facturacion = {
        rfc,
        razonSocial: fac.razonSocial.trim() || undefined,
        regimenFiscal: fac.regimenFiscal || undefined,
        usoCfdi: fac.usoCfdi || undefined,
        cpFiscal: fac.cpFiscal.trim() || undefined,
        email: email || undefined,
      };
      if (guardarFactura) {
        const g = await guardarFacturacion({ ...fac, rfc, email });
        if (!g.ok) {
          setError(g.error);
          return;
        }
      }
    }

    setPending(true);
    const payload = items
      .filter((i) => i.variante?.id)
      .map((i) => ({ productoId: i.product.id, varianteId: i.variante!.id, cantidad: i.qty }));
    if (payload.length === 0) {
      setError("Tu carrito no tiene piezas válidas. Vuelve a agregarlas.");
      setPending(false);
      return;
    }

    const ini = await iniciarCheckout(payload, {
      idempotencyKey: idemKey,
      direccionId: dirId,
      facturacion,
      guardarTarjeta: usaNueva ? guardarTarjeta : false,
    });
    if (!ini.ok) {
      setError(ini.error);
      setPending(false);
      return;
    }

    const { error: perr, paymentIntent } = await stripe.confirmCardPayment(ini.clientSecret, {
      payment_method: usaNueva ? { card: card! } : metodoSel,
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
      <div className="order-2 space-y-4 lg:order-1">
        {/* ── Paso 1 · Envío ── */}
        <section className="overflow-hidden rounded-[20px] border border-linea bg-lino shadow-pieza">
          <PasoHeader
            n={1}
            titulo="Envío"
            activo={paso === 1}
            completado={paso > 1}
            resumen={dirActual ? resumenDir(dirActual) : undefined}
            onEditar={() => setPaso(1)}
          />
          <div className={cn(paso === 1 ? "block" : "hidden", "border-t border-linea px-5 py-5")}>
            {dirs.length > 0 ? (
              <ul className="space-y-2.5">
                {dirs.map((d) => (
                  <li key={d.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 transition-colors",
                        dirId === d.id ? "border-grana bg-grana/[0.04]" : "border-linea hover:border-ceniza/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="dir"
                        checked={dirId === d.id}
                        onChange={() => setDirId(d.id)}
                        className="mt-1 accent-grana"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-tinta">{d.etiqueta || "Dirección"}</span>
                          {d.esPrincipal ? (
                            <span className="rounded-full bg-jade/12 px-2 py-0.5 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-jade">
                              Predeterminada
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-sm text-ceniza">{resumenDir(d)}</span>
                        {d.destinatario ? (
                          <span className="block text-sm text-ceniza">Para {d.destinatario}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}

            {agregando ? (
              <div className="mt-4 space-y-3 rounded-[14px] border border-linea bg-cal/40 p-4">
                {errDir ? (
                  <p className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {errDir}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo label="Etiqueta (Casa, Taller)" value={nueva.etiqueta} onChange={(v) => setNueva({ ...nueva, etiqueta: v })} />
                  <Campo label="Destinatario" value={nueva.destinatario} onChange={(v) => setNueva({ ...nueva, destinatario: v })} autoComplete="name" />
                  <Campo label="Calle y número" value={nueva.calle} onChange={(v) => setNueva({ ...nueva, calle: v })} required className="sm:col-span-2" autoComplete="address-line1" />
                  <Campo label="Colonia" value={nueva.colonia} onChange={(v) => setNueva({ ...nueva, colonia: v })} autoComplete="address-level3" />
                  <Campo label="Ciudad" value={nueva.ciudad} onChange={(v) => setNueva({ ...nueva, ciudad: v })} required autoComplete="address-level2" />
                  <Campo label="Estado" value={nueva.estado} onChange={(v) => setNueva({ ...nueva, estado: v })} autoComplete="address-level1" />
                  <Campo label="C.P." value={nueva.cp} onChange={(v) => setNueva({ ...nueva, cp: v })} autoComplete="postal-code" />
                  <Campo label="Teléfono" value={nueva.telefono} onChange={(v) => setNueva({ ...nueva, telefono: v })} className="sm:col-span-2" autoComplete="tel" />
                </div>
                <Campo label="Referencias (entre calles, color de fachada…)" value={nueva.referencias} onChange={(v) => setNueva({ ...nueva, referencias: v })} />
                <div className="flex items-center gap-4 pt-1">
                  <Boton type="button" pill disabled={guardandoDir} onClick={guardarNuevaDireccion}>
                    {guardandoDir ? "Guardando…" : "Guardar y usar"}
                  </Boton>
                  {dirs.length > 0 ? (
                    <button type="button" onClick={() => setAgregando(false)} className="text-sm text-ceniza transition-colors hover:text-tinta">
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAgregando(true)}
                className="mt-3 text-sm text-tinta underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
              >
                + Enviar a otra dirección
              </button>
            )}

            <div className="mt-5">
              <Boton type="button" size="lg" pill disabled={!dirId || agregando} onClick={() => setPaso(2)}>
                Continuar al pago
              </Boton>
            </div>
          </div>
        </section>

        {/* ── Paso 2 · Pago ── */}
        <section
          className={cn(
            "overflow-hidden rounded-[20px] border shadow-pieza",
            paso >= 2 ? "border-linea bg-lino" : "border-linea/60 bg-lino/50",
          )}
        >
          <PasoHeader
            n={2}
            titulo="Pago"
            activo={paso === 2}
            completado={paso > 2}
            resumen={metodoActual ? resumenMetodo(metodoActual) : metodoSel === "nueva" ? "Tarjeta nueva" : undefined}
            onEditar={() => setPaso(2)}
          />
          {/* El CardElement se mantiene montado (hidden) para poder confirmar el pago desde el paso 3. */}
          <div className={cn(paso === 2 ? "block" : "hidden", "border-t border-linea px-5 py-5")}>
            <ul className="space-y-2.5">
              {tarjetas.map((m) => (
                <li key={m.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[14px] border p-3.5 transition-colors",
                      metodoSel === m.id ? "border-grana bg-grana/[0.04]" : "border-linea hover:border-ceniza/40",
                    )}
                  >
                    <input type="radio" name="pm" checked={metodoSel === m.id} onChange={() => setMetodoSel(m.id)} className="accent-grana" />
                    <span className="flex flex-1 items-center gap-2">
                      <span className="font-medium text-tinta">{BRAND[m.brand] ?? m.brand}</span>
                      <span className="font-mono text-sm tabular-nums text-ceniza">•••• {m.last4}</span>
                      {m.isDefault ? (
                        <span className="rounded-full bg-jade/12 px-2 py-0.5 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-jade">
                          Predeterminada
                        </span>
                      ) : null}
                    </span>
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ceniza">
                      {String(m.expMonth).padStart(2, "0")}/{String(m.expYear).slice(-2)}
                    </span>
                  </label>
                </li>
              ))}
              <li>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[14px] border p-3.5 transition-colors",
                    metodoSel === "nueva" ? "border-grana bg-grana/[0.04]" : "border-linea hover:border-ceniza/40",
                  )}
                >
                  <input type="radio" name="pm" checked={metodoSel === "nueva"} onChange={() => setMetodoSel("nueva")} className="accent-grana" />
                  <span className="font-medium text-tinta">Usar otra tarjeta</span>
                </label>
              </li>
            </ul>

            <div className={cn(metodoSel === "nueva" ? "block" : "hidden", "mt-3")}>
              <div className="rounded-[12px] border border-linea bg-cal/40 px-3.5 py-3.5 focus-within:border-grana">
                <CardElement options={cardStyle} />
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ceniza">
                <input type="checkbox" checked={guardarTarjeta} onChange={(e) => setGuardarTarjeta(e.target.checked)} className="accent-grana" />
                Guardar esta tarjeta para próximas compras
              </label>
              <p className="mt-2 text-xs text-ceniza">Prueba: 4242 4242 4242 4242 · fecha futura · CVC 123</p>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <Boton type="button" size="lg" pill onClick={() => setPaso(3)}>
                Continuar
              </Boton>
              <button type="button" onClick={() => setPaso(1)} className="text-sm text-ceniza transition-colors hover:text-tinta">
                Volver
              </button>
            </div>
          </div>
        </section>

        {/* ── Paso 3 · Revisar y pagar ── */}
        <section
          className={cn(
            "overflow-hidden rounded-[20px] border shadow-pieza",
            paso >= 3 ? "border-linea bg-lino" : "border-linea/60 bg-lino/50",
          )}
        >
          <PasoHeader n={3} titulo="Revisar y pagar" activo={paso === 3} completado={false} />
          <div className={cn(paso === 3 ? "block" : "hidden", "border-t border-linea px-5 py-5")}>
            {/* Facturación */}
            <div className="rounded-[14px] border border-linea bg-cal/40 p-4">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={quiereFactura} onChange={(e) => setQuiereFactura(e.target.checked)} className="accent-grana" />
                <span className="font-medium text-tinta">Necesito factura (CFDI)</span>
              </label>
              {quiereFactura ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo label="RFC" value={fac.rfc} onChange={setFacField("rfc")} required />
                    <Campo label="Razón social / Nombre" value={fac.razonSocial} onChange={setFacField("razonSocial")} />
                    <label className="block">
                      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">Régimen fiscal</span>
                      <select
                        value={fac.regimenFiscal}
                        onChange={(e) => setFacField("regimenFiscal")(e.target.value)}
                        className="w-full rounded-[12px] border border-linea bg-lino px-3.5 py-2.5 text-tinta outline-none transition-colors focus:border-grana"
                      >
                        <option value="">Selecciona…</option>
                        {REGIMENES_FISCALES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">Uso de CFDI</span>
                      <select
                        value={fac.usoCfdi}
                        onChange={(e) => setFacField("usoCfdi")(e.target.value)}
                        className="w-full rounded-[12px] border border-linea bg-lino px-3.5 py-2.5 text-tinta outline-none transition-colors focus:border-grana"
                      >
                        <option value="">Selecciona…</option>
                        {USOS_CFDI.map((u) => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </label>
                    <Campo label="C.P. fiscal" value={fac.cpFiscal} onChange={setFacField("cpFiscal")} />
                    <Campo label="Correo para la factura" value={fac.email} onChange={setFacField("email")} placeholder={emailUsuario} autoComplete="email" />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ceniza">
                    <input type="checkbox" checked={guardarFactura} onChange={(e) => setGuardarFactura(e.target.checked)} className="accent-grana" />
                    Guardar mis datos de facturación
                  </label>
                  <p className="text-xs text-ceniza">
                    Registramos tu solicitud ahora; el CFDI se emite y te llega por correo una vez confirmado el pago.
                  </p>
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="mt-4 rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Boton type="button" size="lg" pill disabled={!stripe || pending} className="mt-5 w-full" onClick={pagar}>
              {pending ? "Procesando…" : `Pagar ${formatMXN(total)} MXN`}
            </Boton>
            <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ceniza">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-anil" aria-hidden>
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Pago seguro con Stripe · tu tarjeta nunca se guarda en Tlachiwalis
            </p>
          </div>
        </section>
      </div>

      {/* Resumen del pedido */}
      <aside className="order-1 lg:order-2">
        <div className="rounded-[20px] border border-linea bg-lino p-5 shadow-pieza lg:sticky lg:top-28">
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
          <div className="mt-4 space-y-1.5 border-t border-linea pt-4 text-sm">
            <div className="flex items-center justify-between text-ceniza">
              <span>Piezas</span>
              <span className="tabular-nums">{formatMXN(total)}</span>
            </div>
            <div className="flex items-center justify-between text-ceniza">
              <span>Envío</span>
              <span>Se coordina tras la compra</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-linea pt-3">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">Total</span>
            <span className="font-display text-2xl tabular-nums text-tinta">
              {formatMXN(total)}
              <span className="ml-1 align-middle font-sans text-sm text-ceniza">MXN</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-ceniza">Le compras directo a los talleres.</p>
        </div>
      </aside>
    </div>
  );
}

type Props = {
  direcciones: Direccion[];
  tarjetas: MetodoPago[];
  factura: PerfilFacturacion;
  nombreSugerido: string;
  telefonoSugerido: string;
  emailUsuario: string;
};

export function CheckoutCliente(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <Inner {...props} />
    </Elements>
  );
}
