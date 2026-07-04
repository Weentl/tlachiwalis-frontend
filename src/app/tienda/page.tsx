import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Catalog } from "@/components/catalog";
import { Hilo } from "@/components/ui/hilo";
import { getPiezas, getOficios } from "@/lib/catalog";
import { regionesConteo } from "@/lib/escaparate";

export const metadata: Metadata = {
  title: "Tienda · Tlachiwalis",
  description: "Artesanía mexicana hecha a mano, directo del taller. Explora por oficio, región y precio.",
};

const TIPOS_VALIDOS = new Set(["unico", "stock_simple", "con_variantes"]);

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ oficio?: string; buscar?: string; tipo?: string; region?: string }>;
}) {
  const sp = await searchParams;
  const [products, oficios] = await Promise.all([getPiezas(), getOficios()]);
  const regiones = regionesConteo(products).map((r) => r.nombre);

  const initialOficio = sp.oficio && oficios.includes(sp.oficio) ? sp.oficio : "Todos";
  const initialQ = typeof sp.buscar === "string" ? sp.buscar.slice(0, 80) : "";
  const initialTipo = sp.tipo && TIPOS_VALIDOS.has(sp.tipo) ? sp.tipo : "";
  const initialRegion = sp.region && regiones.includes(sp.region) ? sp.region : "";

  // Datos reales para el encabezado (que el usuario sepa qué está viendo).
  const talleres = new Set(products.map((p) => p.artesanoSlug).filter(Boolean)).size;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />

      <section className="mx-auto w-full max-w-7xl px-5 pt-28 pb-6 text-center md:px-6 md:pt-32">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">
          Mercado de artesanía
        </p>
        <h1 className="mt-3 font-display text-5xl sm:text-6xl">La tienda</h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ceniza">
          {products.length} piezas hechas a mano por {talleres}{" "}
          {talleres === 1 ? "taller" : "talleres"} de {regiones.length}{" "}
          {regiones.length === 1 ? "región" : "regiones"} de México. Compra directo, a un precio
          justo para quien las crea.
        </p>
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ceniza/80">
          Precios en pesos mexicanos (MXN)
        </p>
        <div className="mx-auto mt-6 flex max-w-[7rem] justify-center">
          <Hilo />
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-5 pb-20 md:px-6 md:pb-28">
        <Catalog
          products={products}
          oficios={oficios}
          regiones={regiones}
          initialOficio={initialOficio}
          initialQ={initialQ}
          initialTipo={initialTipo}
          initialRegion={initialRegion}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
