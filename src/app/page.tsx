import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PiezaCard } from "@/components/pieza-card";
import { PiezaRail } from "@/components/pieza-rail";
import { OficioTiles } from "@/components/oficio-tiles";
import { TallerSpotlight } from "@/components/taller-spotlight";
import { RegionesBand } from "@/components/regiones-band";
import { CierreCta } from "@/components/cierre-cta";
import { TrustRow } from "@/components/trust-row";
import { botonCls } from "@/components/ui/boton";
import { getPiezas, getPiezasDeArtesano } from "@/lib/catalog";
import { getArtesano } from "@/lib/artesano-publico";
import {
  tendencia,
  novedades,
  unicas,
  oficiosVitrina,
  regionesConteo,
} from "@/lib/escaparate";

export default async function Home() {
  const piezas = await getPiezas();
  const spot = await getArtesano("macrina-pacheco");
  const spotPiezas = spot ? await getPiezasDeArtesano(spot.id) : [];

  const enTendencia = tendencia(piezas, 8);
  const recien = novedades(piezas, 6);
  const unicasPiezas = unicas(piezas, 4);
  const oficios = oficiosVitrina(piezas);
  const regiones = regionesConteo(piezas);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      {/* ---------------- Hero (se conserva el concepto) ---------------- */}
      <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-tinta">
        <Image
          src="/images/hero-barro.jpg"
          alt="Barro negro de Oaxaca"
          fill
          priority
          sizes="100vw"
          className="kenburns object-cover brightness-[0.8] saturate-[0.95]"
        />
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-black/55 to-transparent" aria-hidden />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 95% at 50% 45%, transparent 30%, rgba(0,0,0,0.5) 100%)" }}
          aria-hidden
        />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          <p className="rise font-mono text-[0.72rem] uppercase tracking-[0.24em] text-white/85" style={{ animationDelay: "0ms" }}>
            Arte popular mexicano · hecho a mano
          </p>
          <h1 className="rise mt-5 max-w-4xl font-display text-5xl font-medium leading-[1.05] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] sm:text-7xl" style={{ animationDelay: "120ms" }}>
            Piezas únicas, directo de las manos que las crean
          </h1>
          <p className="rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={{ animationDelay: "260ms" }}>
            Hecho a mano por los artesanos de México. Compra directo del taller, a un precio justo
            para quien lo crea.
          </p>
          <div className="rise mt-9 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: "400ms" }}>
            <Link href="/tienda" className={botonCls({ size: "lg", pill: true })}>
              Explorar la tienda
            </Link>
            <Link
              href="/talleres"
              className="text-base text-white underline decoration-white/50 underline-offset-[6px] transition-colors hover:decoration-white"
            >
              Conoce a los artesanos
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Confianza (pegada al hero) ---------------- */}
      <section className="border-y border-linea bg-lino">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <TrustRow />
        </div>
      </section>

      {/* ---------------- Explorar por oficio ---------------- */}
      <OficioTiles oficios={oficios} />

      {/* ---------------- En tendencia ---------------- */}
      <PiezaRail
        eyebrow="Lo que más se está viendo"
        titulo="En tendencia"
        apoyo="Las piezas que más miradas se llevan esta semana."
        verTodoHref="/tienda"
        productos={enTendencia}
      />

      {/* ---------------- Spotlight del taller ---------------- */}
      {spot ? <TallerSpotlight artesano={spot} piezas={spotPiezas} /> : null}

      {/* ---------------- Recién del taller ---------------- */}
      <PiezaRail
        eyebrow="Novedades"
        titulo="Recién salidas del taller"
        apoyo="Lo último que los talleres subieron."
        verTodoHref="/tienda"
        productos={recien}
      />

      {/* ---------------- Piezas únicas ---------------- */}
      {unicasPiezas.length > 0 ? (
        <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-6 md:py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">
                Solo existe una
              </p>
              <h2 className="mt-1.5 font-display text-3xl text-tinta sm:text-4xl">Piezas únicas</h2>
              <p className="mt-2 max-w-lg text-ceniza">
                Irrepetibles: cuando alguien se la lleva, se acabó — no hay reposición.
              </p>
            </div>
            <Link href="/tienda?tipo=unico" className="shrink-0 text-sm font-medium text-grana hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {unicasPiezas.map((p) => (
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

      {/* ---------------- Por región ---------------- */}
      <RegionesBand regiones={regiones} />

      {/* ---------------- Cierre ---------------- */}
      <CierreCta />

      <SiteFooter />
    </div>
  );
}
