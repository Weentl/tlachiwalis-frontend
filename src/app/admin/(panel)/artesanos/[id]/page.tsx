import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getArtesano } from "@/lib/admin/artesanos";
import { leerDetalleCobros, leerEmailArtesano } from "@/lib/vendedor/cobros";

function Fila({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{valor || "—"}</dd>
    </div>
  );
}

// Códigos de requisitos de Stripe → etiqueta legible.
const REQ_LABEL: Record<string, string> = {
  "individual.verification.document": "Documento de identidad (verificación)",
  "individual.verification.additional_document": "Documento adicional de identidad",
  "individual.id_number": "RFC / número fiscal",
  "individual.address.line1": "Domicilio",
  "individual.dob.day": "Fecha de nacimiento",
  "company.tax_id": "RFC de la empresa",
  "company.verification.document": "Documento de la empresa",
  external_account: "Cuenta bancaria (CLABE)",
  "business_profile.url": "Sitio o descripción del negocio",
  "business_profile.mcc": "Categoría del negocio",
  "tos_acceptance.date": "Aceptación de términos",
};
const traducirReq = (code: string) => REQ_LABEL[code] ?? code;

export default async function VerArtesano({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const artesano = await getArtesano(id);
  if (!artesano) notFound();

  const estadoTxt =
    artesano.status === "activo"
      ? "Activo"
      : artesano.status === "pendiente"
        ? "Pendiente de aprobación"
        : "Suspendido";

  // Datos en vivo (paralelo): detalle de Stripe (no sensible) + correo de acceso (auth.users).
  const [detalle, email] = await Promise.all([
    artesano.stripe_account_id ? leerDetalleCobros(id) : Promise.resolve(null),
    artesano.user_id ? leerEmailArtesano(id) : Promise.resolve(null),
  ]);

  const cobros = artesano.cobros_habilitados
    ? { txt: "Puede recibir pagos (cobros activos)", cls: "text-emerald-700", dot: "#3f7a4f" }
    : artesano.cobros_detalles_enviados
      ? { txt: "Datos enviados — en revisión de Stripe", cls: "text-amber-700", dot: "#a8761f" }
      : artesano.stripe_account_id
        ? { txt: "Onboarding iniciado, incompleto", cls: "text-muted-foreground", dot: "#8c7c68" }
        : { txt: "Aún no conecta sus cobros", cls: "text-muted-foreground", dot: "#c9b79a" };
  const acctMasked = artesano.stripe_account_id
    ? `${artesano.stripe_account_id.slice(0, 8)}…${artesano.stripe_account_id.slice(-4)}`
    : "—";
  const fechaAlta = new Date(artesano.created_at).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const banco = detalle?.banco
    ? `${detalle.banco.nombre ?? "Banco"} ····${detalle.banco.last4 ?? ""}`
    : "—";
  const requisitos = detalle?.requisitos ?? [];

  // Datos de NUESTRO onboarding (registro autoguiado, 0013).
  const nombreCompleto =
    [artesano.nombres, artesano.apellido_paterno, artesano.apellido_materno]
      .filter(Boolean)
      .join(" ") || artesano.nombre;
  const tipoVendedorTxt =
    artesano.tipo_vendedor === "persona"
      ? "Persona"
      : artesano.tipo_vendedor === "taller"
        ? "Taller"
        : artesano.tipo_vendedor === "tienda"
          ? "Tienda"
          : artesano.tipo_vendedor;
  const fechaNac = artesano.fecha_nacimiento
    ? new Date(`${artesano.fecha_nacimiento}T12:00:00`).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  // Taller/negocio: mensaje informativo cuando es persona (por cuenta propia), o el nombre.
  const negocioTxt =
    artesano.tipo_vendedor === "persona"
      ? "Por cuenta propia (artesano individual)"
      : artesano.nombre_negocio || artesano.taller || null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/artesanos"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Artesanos
          </Link>
          <h1 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-foreground">
            {artesano.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[artesano.oficio, artesano.region, estadoTxt].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Link
          href={`/admin/artesanos/${id}/editar`}
          className="inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
        >
          <Pencil className="h-4 w-4" /> Editar
        </Link>
      </header>

      {/* Ficha (solo lectura) */}
      <div className="card-warm p-6">
        <div className="flex gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-ob-sm border border-tinto/15 bg-background">
            {artesano.foto_url ? (
              <Image src={artesano.foto_url} alt={artesano.nombre} fill sizes="80px" className="object-cover" />
            ) : null}
          </div>
          <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Fila label="Taller" valor={negocioTxt} />
            <Fila label="Contacto" valor={email ?? artesano.contacto} />
            <Fila label="Oficio" valor={artesano.oficio} />
            <Fila label="Región" valor={artesano.region} />
          </dl>
        </div>
        {artesano.semblanza ? (
          <div className="mt-4 border-t border-tinto/10 pt-4">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Semblanza</p>
            <p className="mt-1 text-sm text-foreground">{artesano.semblanza}</p>
          </div>
        ) : null}
      </div>

      {/* Cobros y alta */}
      <div className="mt-6 card-warm p-6">
        <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Cobros y alta
        </h2>

        <dl className="mt-3 space-y-2.5 text-sm">
          <Fila
            label="Registro"
            valor={artesano.user_id ? "Se dio de alta y creó su cuenta" : "Aún no reclama su acceso"}
          />
          <Fila label="Fecha de alta" valor={fechaAlta} />
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Estado de cobros</dt>
            <dd className={`inline-flex items-center gap-1.5 text-right font-medium ${cobros.cls}`}>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: cobros.dot }}
                aria-hidden
              />
              {cobros.txt}
            </dd>
          </div>
        </dl>

        {/* Registrado en STRIPE (no sensible) */}
        <div className="mt-5 border-t border-tinto/10 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-barro">
            Registrado en Stripe
          </h3>
          {detalle?.conectado ? (
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Cuenta Stripe</dt>
                <dd className="text-right font-mono text-xs text-foreground">{acctMasked}</dd>
              </div>
              <Fila label="Titular" valor={detalle.nombre} />
              <Fila label="Correo" valor={detalle.email} />
              <Fila label="RFC registrado" valor={detalle.rfcRegistrado ? "Sí" : "No"} />
              <Fila label="Cuenta bancaria" valor={banco} />
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Requisitos pendientes</dt>
                <dd className="text-right text-foreground">
                  {requisitos.length > 0 ? (
                    <ul className="space-y-0.5">
                      {requisitos.map((c) => (
                        <li key={c} className="text-amber-700">
                          {traducirReq(c)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "Ninguno"
                  )}
                </dd>
              </div>
            </dl>
          ) : artesano.stripe_account_id ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No se pudo leer el detalle de Stripe en este momento.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no ha conectado su cuenta de Stripe.
            </p>
          )}
        </div>

        {/* Datos de SU REGISTRO (nuestro onboarding autoguiado) */}
        <div className="mt-5 border-t border-tinto/10 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-barro">
            Datos de su registro
          </h3>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            <Fila label="Nombre completo" valor={nombreCompleto} />
            <Fila label="Teléfono" valor={artesano.telefono} />
            <Fila label="Tipo de vendedor" valor={tipoVendedorTxt} />
            <Fila label="Negocio" valor={negocioTxt} />
            <Fila label="Fecha de nacimiento" valor={fechaNac} />
            <Fila label="Ciudad" valor={artesano.direccion?.ciudad} />
            <Fila
              label="Años de experiencia"
              valor={
                artesano.anios_experiencia != null ? String(artesano.anios_experiencia) : null
              }
            />
            {artesano.num_personas != null ? (
              <Fila label="Personas en el taller" valor={String(artesano.num_personas)} />
            ) : null}
            <Fila label="Envía a todo el país" valor={artesano.envia_nacional ? "Sí" : "No"} />
            <Fila label="Instagram" valor={artesano.redes?.instagram} />
            <Fila label="Sitio web" valor={artesano.redes?.sitio} />
          </dl>
        </div>

        <p className="mt-4 rounded-ob-sm border border-tinto/12 bg-tinto/[0.02] px-3 py-2 text-xs text-muted-foreground">
          Los datos fiscales y bancarios (RFC, CLABE, verificación) los captura y resguarda{" "}
          <strong>Stripe</strong>, no Tlachiwalis: por eso arriba solo se indica si el RFC está{" "}
          <em>registrado</em> y los últimos 4 dígitos del banco.
        </p>
      </div>
    </div>
  );
}
