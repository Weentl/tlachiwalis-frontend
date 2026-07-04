import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MediaFrame } from "@/components/framed-image";
import { Hilo } from "@/components/ui/hilo";
import { botonCls } from "@/components/ui/boton";
import { CierreCta } from "@/components/cierre-cta";

export const metadata: Metadata = {
  title: "Nuestra historia · Tlachiwalis",
  description:
    "Por qué existe Tlachiwalis: artesanía mexicana comprada directo del taller, a un precio justo para quien la crea.",
};

const PASOS = [
  {
    n: "01",
    titulo: "Compras directo del taller",
    texto:
      "Cada pieza la eliges a quien la hizo — con su nombre, su región y su técnica a la vista. Sin intermediarios que se queden con lo tuyo.",
  },
  {
    n: "02",
    titulo: "El artesano recibe un precio justo",
    texto:
      "El precio que pagas es el precio que el artesano pidió. Su trabajo vale, y aquí se le paga como vale.",
  },
  {
    n: "03",
    titulo: "El oficio sigue vivo",
    texto:
      "Cada compra sostiene un taller y ayuda a que un saber que lleva generaciones no se pierda.",
  },
];

const PROMESAS = [
  { titulo: "Directo del taller", texto: "Le compras a quien la hizo, no a un revendedor." },
  { titulo: "Hecho a mano", texto: "Piezas reales, muchas únicas. Ninguna sale de una máquina." },
  { titulo: "Precio justo", texto: "Lo que pagas llega a las manos que crearon la pieza." },
  { titulo: "Pago seguro", texto: "Procesado con cifrado por Stripe. Tu tarjeta no se guarda aquí." },
  { titulo: "Envío a todo México", texto: "Empaque cuidado y guía de rastreo en cada pedido." },
  { titulo: "Con su historia", texto: "Cada pieza carga el nombre, la región y la técnica de su taller." },
];

export default function NuestraHistoriaPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />

      {/* Encabezado */}
      <section className="mx-auto w-full max-w-3xl px-6 pt-28 pb-4 md:pt-32">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">
          Nuestra historia
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">
          De la vitrina a las manos
        </h1>
        <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-tinta/85">
          Un museo pone las cosas detrás de un vidrio. Un taller te deja tocarlas. Tlachiwalis nació
          para acercar el taller del artesano a tu casa: comprar arte popular mexicano directo de
          quien lo hace, a un precio justo para quien lo crea.
        </p>
        <div className="mt-8 max-w-[7rem]">
          <Hilo />
        </div>
      </section>

      {/* Imagen ancla (arco Portal) */}
      <section className="mx-auto w-full max-w-5xl px-6 py-10">
        <MediaFrame
          src="/images/hero-opt-1-workshop.jpg"
          alt="Manos trabajando en el taller"
          aspect="aspect-[16/10]"
          sizes="(max-width: 768px) 100vw, 64rem"
          variant="portal"
          zoomOnHover={false}
        />
        <p className="mt-3 text-center font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ceniza">
          El lugar donde las cosas se hacen
        </p>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
        <h2 className="font-display text-3xl sm:text-4xl">Cómo funciona</h2>
        <p className="mt-2 max-w-lg text-ceniza">Simple, y con las manos siempre al centro.</p>
        <div className="mt-9 grid gap-8 md:grid-cols-3">
          {PASOS.map((p) => (
            <div key={p.n}>
              <p className="font-mono text-2xl tabular-nums text-grana">{p.n}</p>
              <div className="mt-2 h-px w-10 bg-linea" />
              <h3 className="mt-3 font-display text-xl text-tinta">{p.titulo}</h3>
              <p className="mt-2 leading-relaxed text-ceniza">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Significado (banda añil) */}
      <section className="bg-anil text-cal">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-cal/70">
            Náhuatl
          </p>
          <p className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            Tlachiwalis: <span className="italic">lo hecho, lo creado</span>
          </p>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-cal/85">
            El nombre lo dice todo: lo que existe porque unas manos lo hicieron. Ese es el sujeto de
            todo lo que hacemos — no la mercancía, sino quien la crea.
          </p>
        </div>
      </section>

      {/* Nuestras promesas */}
      <section className="mx-auto w-full max-w-5xl px-6 py-14 md:py-20">
        <div className="flex items-center gap-5">
          <h2 className="shrink-0 font-display text-3xl sm:text-4xl">Lo que te prometemos</h2>
          <Hilo className="max-w-[8rem]" />
        </div>
        <div className="mt-9 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {PROMESAS.map((p) => (
            <div key={p.titulo} className="border-t border-linea pt-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-tinta">
                {p.titulo}
              </p>
              <p className="mt-2 leading-relaxed text-ceniza">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Invitación a explorar (previo al cierre) */}
      <section className="bg-arena py-14 text-center md:py-16">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-display text-3xl sm:text-4xl">Empieza por una pieza</h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-ceniza">
            No necesitas saber de artesanía para empezar. Elige lo que te guste; detrás de cada
            objeto hay una historia que vas a querer conocer.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link href="/tienda" className={botonCls({ size: "lg", pill: true })}>
              Explorar la tienda
            </Link>
            <Link
              href="/talleres"
              className="text-base text-grana underline decoration-grana/40 underline-offset-4 transition-colors hover:decoration-grana"
            >
              Conoce a los artesanos →
            </Link>
          </div>
        </div>
      </section>

      {/* Cierre */}
      <CierreCta />

      <SiteFooter />
    </div>
  );
}
