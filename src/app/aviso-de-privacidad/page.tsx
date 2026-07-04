import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hilo } from "@/components/ui/hilo";

export const metadata: Metadata = {
  title: "Aviso de Privacidad · Tlachiwalis",
  description:
    "Cómo Tlachiwalis trata tus datos personales conforme a la LFPDPPP: finalidades, transferencias y tus derechos ARCO.",
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-tinta">{titulo}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-tinta/85">{children}</div>
    </section>
  );
}

export default function AvisoPrivacidadPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />

      <main className="mx-auto w-full max-w-3xl px-6 pt-28 pb-24 md:pt-32">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">
          Protección de datos
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Aviso de Privacidad</h1>
        <div className="mt-6 max-w-[7rem]">
          <Hilo />
        </div>

        <p className="mt-8 rounded-[14px] border border-cempa/40 bg-cempa/10 px-4 py-3 text-sm text-tinta">
          <strong>Borrador.</strong> Este texto es una base conforme a la nueva LFPDPPP (vigente
          desde el 21 de marzo de 2025). Debe validarlo un abogado antes de operar con datos reales.
        </p>

        <Seccion titulo="Responsable">
          <p>
            <strong>Tlachiwalis</strong> es responsable del tratamiento de tus datos personales.
            Para cualquier tema de privacidad, escríbenos a{" "}
            <a
              href="mailto:privacidad@tlachiwalis.mx"
              className="text-grana underline decoration-grana/40 underline-offset-2 hover:decoration-grana"
            >
              privacidad@tlachiwalis.mx
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo="Qué datos recabamos">
          <p>Aplicamos el principio de minimización: pedimos lo mínimo y en el momento oportuno.</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Al crear tu cuenta:</strong> correo electrónico (y contraseña cifrada), o los
              datos básicos que comparta Google si entras con esa opción.
            </li>
            <li>
              <strong>Opcional:</strong> tu nombre, para personalizar el trato.
            </li>
            <li>
              <strong>Solo al comprar:</strong> nombre, teléfono y domicilio de envío.
            </li>
            <li>
              <strong>Nunca aquí:</strong> los datos de tu tarjeta. El pago lo procesa Stripe con
              cifrado; nosotros no vemos ni guardamos el número de tu tarjeta.
            </li>
          </ul>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <ul className="ml-5 list-disc space-y-1">
            <li>Crear y administrar tu cuenta e identificarte.</li>
            <li>Procesar tus compras, envíos y su seguimiento.</li>
            <li>Atender tus dudas, aclaraciones y devoluciones.</li>
            <li>
              Enviarte novedades y promociones <em>solo si diste tu consentimiento por separado</em>{" "}
              (puedes revocarlo cuando quieras).
            </li>
          </ul>
        </Seccion>

        <Seccion titulo="Con quién los compartimos">
          <p>Transferimos los datos estrictamente necesarios a:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Stripe</strong> — procesamiento de pagos.
            </li>
            <li>
              <strong>Empresas de paquetería</strong> — para entregarte tu pedido.
            </li>
            <li>
              <strong>El artesano / taller</strong> — los datos de envío necesarios para prepararlo.
            </li>
            <li>
              <strong>Proveedor autorizado (PAC)</strong> — si se requiere comprobante fiscal.
            </li>
          </ul>
          <p>No vendemos tus datos personales.</p>
        </Seccion>

        <Seccion titulo="Tus derechos (ARCO)">
          <p>
            Puedes solicitar el <strong>Acceso</strong>, <strong>Rectificación</strong>,{" "}
            <strong>Cancelación</strong> u <strong>Oposición</strong> al tratamiento de tus datos, así
            como revocar tu consentimiento. Desde <strong>Mi cuenta → Privacidad y datos</strong>
            podrás descargar tus datos, activar o desactivar el marketing y eliminar tu cuenta; o
            escríbenos a{" "}
            <a
              href="mailto:privacidad@tlachiwalis.mx"
              className="text-grana underline decoration-grana/40 underline-offset-2 hover:decoration-grana"
            >
              privacidad@tlachiwalis.mx
            </a>
            . Revocar es tan sencillo como otorgar el consentimiento.
          </p>
          <p>
            Si eliminas tu cuenta, bloqueamos tus datos de inmediato y los suprimimos al vencer los
            plazos de conservación que exige la ley (por ejemplo, obligaciones fiscales).
          </p>
        </Seccion>

        <Seccion titulo="Cambios y autoridad">
          <p>
            Podemos actualizar este aviso; publicaremos la versión vigente en esta página. La
            autoridad en materia de protección de datos es la{" "}
            <strong>Secretaría Anticorrupción y Buen Gobierno</strong>.
          </p>
        </Seccion>
      </main>

      <SiteFooter />
    </div>
  );
}
