import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TallerCard } from "@/components/taller-card";
import { Hilo } from "@/components/ui/hilo";
import { getTalleres } from "@/lib/artesano-publico";

export const metadata: Metadata = {
  title: "Talleres · Tlachiwalis",
  description: "Conoce a los artesanos y talleres de México detrás de cada pieza.",
};

export default async function TalleresPage() {
  const talleres = await getTalleres();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />

      <section className="mx-auto w-full max-w-7xl px-5 pt-28 pb-6 md:px-6 md:pt-32">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">
          Los talleres
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">Manos que crean</h1>
        <p className="mt-5 max-w-[58ch] leading-relaxed text-ceniza">
          Detrás de cada pieza hay un taller y una historia. Conoce a los artesanos de México y
          compra directo de sus manos.
        </p>
        <div className="mt-7 max-w-[7rem]">
          <Hilo />
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-5 pt-8 pb-20 md:px-6 md:pb-28">
        {talleres.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:gap-x-8 lg:grid-cols-3">
            {talleres.map((t) => (
              <TallerCard
                key={t.slug}
                slug={t.slug}
                nombre={t.nombre}
                oficio={t.oficio}
                region={t.region}
                fotoUrl={t.fotoUrl}
                numPiezas={t.numPiezas}
              />
            ))}
          </div>
        ) : (
          <p className="py-24 text-center text-lg text-ceniza">
            Pronto conocerás a los talleres.
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
