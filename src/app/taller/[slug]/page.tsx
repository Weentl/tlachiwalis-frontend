import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MediaFrame } from "@/components/framed-image";
import { PiezaCard } from "@/components/pieza-card";
import { Hilo } from "@/components/ui/hilo";
import { botonCls } from "@/components/ui/boton";
import { getArtesano, getArtesanos } from "@/lib/artesano-publico";
import { getPiezasDeArtesano } from "@/lib/catalog";

export async function generateStaticParams() {
  const artesanos = await getArtesanos();
  return artesanos.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArtesano(slug);
  return {
    title: a ? `${a.nombre} · Taller · Tlachiwalis` : "Taller · Tlachiwalis",
    description: a?.semblanza ?? undefined,
  };
}

// URLs de redes (whitelist): nunca confiar en el valor crudo para nada más que un href.
const instaUrl = (v: string) =>
  `https://instagram.com/${v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "")}`;
const httpUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

export default async function TallerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArtesano(slug);
  if (!a) notFound();

  const piezas = await getPiezasDeArtesano(a.id);
  piezas.sort((x, y) => Number(y.disponibleTotal > 0) - Number(x.disponibleTotal > 0));

  const redes = a.redes ?? {};
  const redLinks: { label: string; href: string }[] = [];
  if (redes.instagram) redLinks.push({ label: "Instagram", href: instaUrl(redes.instagram) });
  if (redes.facebook) redLinks.push({ label: "Facebook", href: httpUrl(redes.facebook) });
  if (redes.sitio) redLinks.push({ label: "Sitio", href: httpUrl(redes.sitio) });

  // Ficha del taller (datos duros, solo los que existen).
  const ficha: [string, string][] = [];
  if (a.oficio) ficha.push(["Oficio", a.oficio]);
  if (a.region) ficha.push(["Región", a.region]);
  if (a.aniosExperiencia) ficha.push(["Experiencia", `${a.aniosExperiencia} años`]);
  if (a.numPersonas)
    ficha.push(["En el taller", `${a.numPersonas} ${a.numPersonas === 1 ? "persona" : "personas"}`]);
  ficha.push(["Piezas", `${piezas.length}`]);
  ficha.push(["Envíos", a.enviaNacional ? "A todo México" : "Por confirmar"]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      {/* Portada full-bleed (foto del taller o degradado cálido de marca). */}
      <div className="relative h-[52svh] min-h-[380px] w-full overflow-hidden bg-tinta">
        {a.fotoPortada ? (
          <Image src={a.fotoPortada} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-grana/30 via-arena to-anil/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-tinta/70 via-tinta/15 to-transparent" />
      </div>

      {/* Identidad — retrato "Portal" (arco) que se solapa con la portada. */}
      <section className="mx-auto w-full max-w-5xl px-5 md:px-6">
        <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:gap-10">
          <div className="-mt-28 w-44 md:w-56">
            {a.fotoUrl ? (
              <MediaFrame
                src={a.fotoUrl}
                alt={a.nombre}
                aspect="aspect-[4/5]"
                sizes="224px"
                variant="portal"
                zoomOnHover={false}
                priority
              />
            ) : (
              <div className="portal flex aspect-[4/5] items-center justify-center bg-arena shadow-alto ring-1 ring-linea">
                <span className="font-display text-6xl text-grana/40">{a.nombre.charAt(0)}</span>
              </div>
            )}
          </div>

          <div className="pt-2 md:pt-8">
            {[a.oficio, a.region].filter(Boolean).length > 0 ? (
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ceniza">
                {[a.oficio, a.region].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <h1 className="mt-2.5 font-display text-4xl leading-[1.08] text-tinta sm:text-5xl">
              {a.nombre}
            </h1>
            {a.semblanza ? (
              <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-tinta/85">
                {a.semblanza}
              </p>
            ) : null}
            {redLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {redLinks.map((r) => (
                  <a
                    key={r.label}
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="rounded-full border border-linea px-4 py-2 font-mono text-[0.66rem] uppercase tracking-[0.1em] text-tinta transition-colors hover:border-grana hover:text-grana"
                  >
                    {r.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Ficha del taller (datos duros con hairlines). */}
        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-linea ring-1 ring-linea sm:grid-cols-3 lg:grid-cols-6">
          {ficha.map(([k, v]) => (
            <div key={k} className="bg-lino p-4">
              <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ceniza">{k}</dt>
              <dd className="mt-1 font-display text-lg leading-tight text-tinta">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Piezas del taller. */}
      <section className="mx-auto w-full max-w-7xl px-5 pt-16 pb-20 md:px-6">
        <div className="mb-8 flex items-center gap-5">
          <h2 className="shrink-0 font-display text-3xl text-tinta sm:text-4xl">Sus piezas</h2>
          <Hilo className="max-w-[8rem]" />
        </div>
        {piezas.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {piezas.map((p) => (
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
        ) : (
          <p className="text-lg text-ceniza">Este taller está preparando sus primeras piezas.</p>
        )}
      </section>

      {/* Cierre. */}
      <section className="bg-arena px-6 py-16 text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ceniza">
          Sigue explorando
        </p>
        <Link
          href="/tienda"
          className={botonCls({ variant: "primary", size: "lg", pill: true, className: "mt-4" })}
        >
          Ver todo el catálogo
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
