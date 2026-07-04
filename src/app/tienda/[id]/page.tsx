import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MediaFrame } from "@/components/framed-image";
import { PiezaCard } from "@/components/pieza-card";
import { GaleriaPieza } from "@/components/galeria-pieza";
import { SelectorVariante } from "@/components/selector-variante";
import { ComprarSimple } from "@/components/comprar-simple";
import { PasaportePieza } from "@/components/pasaporte-pieza";
import { Hilo } from "@/components/ui/hilo";
import { formatMXN } from "@/lib/products";
import { getProduct, getProducts, getPiezas } from "@/lib/catalog";
import { getPiezaExtra } from "@/lib/tienda-detalle";

export async function generateStaticParams() {
  const items = await getProducts();
  return items.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  return { title: p ? `${p.nombre} · Tlachiwalis` : "Pieza · Tlachiwalis" };
}

export default async function PiezaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [all, extra] = await Promise.all([getPiezas(), getPiezaExtra(id)]);
  const relacionadas = [
    ...all.filter((p) => p.oficio === product.oficio && p.id !== product.id),
    ...all.filter((p) => p.oficio !== product.oficio && p.id !== product.id),
  ].slice(0, 4);

  // Pasaporte: specs de la vista plana (con valor) + atributos ricos de la categoría.
  const baseSpecs: [string, string][] = [
    ["Material", product.materiales],
    ["Técnica", product.tecnica],
    ["Medidas", product.medidas],
    ["Región", product.region],
    ["Taller", product.maker],
  ];
  const filas: [string, string][] = [
    // Filtra pseudo-valores tipo "Ver guía de tallas" (parecen link roto en la ficha).
    ...baseSpecs.filter(([, v]) => Boolean(v && v.trim()) && !/^ver /i.test(v)),
    ...extra.atributos.map((a) => [a.nombre, a.valor] as [string, string]),
  ];

  // Ramas por tipo: con variantes → selector reactivo; sin variantes → única/stock.
  const esVariantes = extra.ejes.length > 0;
  const varDefault = !esVariantes && extra.variantes.length > 0 ? extra.variantes[0] : null;
  const disponibleSimple = varDefault ? varDefault.disponible : null; // null = fallback estático
  const precioDesde =
    extra.variantes.length > 0
      ? Math.min(...extra.variantes.map((v) => v.precio))
      : product.precio;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />

      <main className="mx-auto w-full max-w-7xl px-5 pt-24 pb-20 md:px-6 md:pt-28">
        <Link
          href="/tienda"
          className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ceniza transition-colors hover:text-grana"
        >
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-16">
          {extra.imagenes.length > 0 ? (
            <div className="md:sticky md:top-28 md:self-start">
              <GaleriaPieza imagenes={extra.imagenes} nombre={product.nombre} />
            </div>
          ) : (
            <div className="md:sticky md:top-28 md:self-start">
              <MediaFrame
                src={product.img}
                alt={product.nombre}
                aspect="aspect-[4/5]"
                sizes="(max-width: 768px) 100vw, 50vw"
                zoomOnHover={false}
                priority
              />
            </div>
          )}

          <div className="flex flex-col">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-ceniza">
              {product.oficio} · {product.region}
            </p>
            <h1 className="mt-2.5 font-display text-4xl leading-[1.1] text-tinta sm:text-5xl">
              {product.nombre}
            </h1>

            {/* Precio: fijo para única/stock; reactivo (dentro del selector) para variantes. */}
            {!esVariantes ? (
              <p className="mt-4 font-display text-3xl tabular-nums text-grana">
                {formatMXN(product.precio)}
                <span className="ml-1.5 align-middle font-sans text-base text-ceniza">MXN</span>
              </p>
            ) : null}

            {/* Zona de compra por tipo */}
            {esVariantes ? (
              <SelectorVariante
                product={product}
                ejes={extra.ejes}
                variantes={extra.variantes}
                precioDesde={precioDesde}
              />
            ) : (
              <ComprarSimple
                product={product}
                tipo={extra.tipo}
                disponible={disponibleSimple}
                varianteId={varDefault?.id}
              />
            )}

            <p className="mt-4 flex items-center gap-2 text-sm text-ceniza">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-cempa" aria-hidden />
              Hecho a mano: cada pieza es única y puede variar ligeramente.
            </p>

            {/* Confianza compacta */}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-linea pt-5 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-ceniza">
              <span>Directo del taller</span>
              <span>Pago seguro</span>
              <span>Envío a todo México</span>
            </div>

            {/* Descripción (narrativa, después de la decisión de compra) */}
            <p className="mt-6 max-w-[62ch] leading-relaxed text-tinta/85">
              {product.descripcion}
            </p>

            {/* Pasaporte de la pieza */}
            <PasaportePieza filas={filas} />

            {/* Bloque del artesano */}
            {extra.artesano ? (
              <Link
                href={`/taller/${extra.artesano.slug}`}
                className="group mt-6 flex items-center gap-4 rounded-[18px] border border-linea bg-lino p-4 shadow-pieza transition-colors hover:border-ceniza/45"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-arena ring-1 ring-linea">
                  {extra.artesano.fotoUrl ? (
                    <Image
                      src={extra.artesano.fotoUrl}
                      alt={extra.artesano.nombre}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ceniza">
                    Del taller
                  </span>
                  <span className="block font-display text-lg leading-tight text-tinta">
                    {extra.artesano.nombre}
                  </span>
                  <span className="text-sm text-grana">
                    {extra.artesano.region ? `${extra.artesano.region} · ` : ""}Ver el taller →
                  </span>
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </main>

      {relacionadas.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-16 md:px-6 md:py-20">
          <div className="mb-8 flex items-center gap-5">
            <h2 className="shrink-0 font-display text-3xl text-tinta sm:text-4xl">Más del oficio</h2>
            <Hilo className="max-w-[8rem]" />
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-6">
            {relacionadas.map((p) => (
              <PiezaCard
                key={p.id}
                id={p.id}
                nombre={p.nombre}
                maker={p.maker}
                region={p.region}
                precio={p.precio}
                precioDesde={p.precioDesde}
                esDesde={p.esDesde}
                img={p.img}
                disponibleTotal={p.disponibleTotal}
                tipo={p.tipo}
              />
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </div>
  );
}
