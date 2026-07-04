import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Boton } from "@/components/ui/boton";
import { Campo, labelCls } from "@/components/cuenta/campo";
import { ChipsIntereses } from "@/components/cuenta/chips-intereses";
import { requireComprador } from "@/lib/comprador/auth";
import { guardarOnboarding, omitirOnboarding } from "./actions";

export const metadata: Metadata = { title: "Personaliza tu experiencia · Tlachiwalis" };

const COMO = ["Instagram", "Un amigo o familiar", "Búsqueda en internet", "Un taller o artesano", "Otro"];

export default async function OnboardingPage() {
  await requireComprador();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-28 pb-20 md:pt-32">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">
          Casi listo · paso opcional
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Cuéntanos de ti</h1>
        <p className="mt-3 leading-relaxed text-ceniza">
          Con esto personalizamos lo que te mostramos. Puedes omitirlo y hacerlo después desde tu
          cuenta. No pedimos tarjeta ni dirección aquí.
        </p>

        <form action={guardarOnboarding} className="mt-8 space-y-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre" name="nombre" autoComplete="given-name" placeholder="Tu nombre" />
            <Campo label="Apellido" name="apellido" autoComplete="family-name" placeholder="Tu apellido" />
          </div>

          <div>
            <p className={labelCls}>¿Qué te interesa?</p>
            <p className="mt-1 text-sm text-ceniza">
              Elige los oficios que más te gustan para recomendarte piezas.
            </p>
            <div className="mt-3">
              <ChipsIntereses />
            </div>
          </div>

          <div>
            <label htmlFor="como_conocio" className={labelCls}>
              ¿Cómo nos conociste? (opcional)
            </label>
            <select
              id="como_conocio"
              name="como_conocio"
              defaultValue=""
              className="mt-1.5 w-full rounded-[12px] border border-linea bg-lino px-3.5 py-2.5 text-tinta focus:border-grana focus:outline-none"
            >
              <option value="">Prefiero no decir</option>
              {COMO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Boton type="submit" size="lg" pill>
              Continuar
            </Boton>
          </div>
        </form>

        <form action={omitirOnboarding} className="mt-4">
          <button
            type="submit"
            className="text-sm text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
          >
            Omitir por ahora
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
