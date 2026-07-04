import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FormLogin } from "@/components/cuenta/form-login";
import { BotonGoogle } from "@/components/cuenta/boton-google";
import { AuthPanel } from "@/components/cuenta/auth-panel";

export const metadata: Metadata = { title: "Entrar · Tlachiwalis" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-12 px-6 pt-28 pb-16 md:grid-cols-2 md:items-stretch md:pt-32">
        <div className="mx-auto w-full max-w-md">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">
            Tu cuenta
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Entrar</h1>

          {sp.nueva ? (
            <p className="mt-5 rounded-[12px] border border-jade/40 bg-jade/5 px-3.5 py-2.5 text-sm text-tinta">
              Tu cuenta se creó. Inicia sesión para continuar.
            </p>
          ) : null}
          {sp.error === "oauth" ? (
            <p className="mt-5 rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              No se pudo entrar con Google. Intenta de nuevo o usa tu correo.
            </p>
          ) : null}

          <div className="mt-8">
            <BotonGoogle next="/cuenta" />
            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-linea" />
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ceniza">
                o con tu correo
              </span>
              <span className="h-px flex-1 bg-linea" />
            </div>
            <FormLogin />
          </div>

          <p className="mt-6 text-sm text-ceniza">
            ¿Aún no tienes cuenta?{" "}
            <Link
              href="/registrarse"
              className="text-grana underline decoration-grana/40 underline-offset-4 hover:decoration-grana"
            >
              Crear una
            </Link>
          </p>
        </div>

        <AuthPanel />
      </main>
      <SiteFooter />
    </div>
  );
}
