import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CuentaDashboard } from "@/components/cuenta/dashboard";
import { AvatarIniciales } from "@/components/cuenta/avatar-iniciales";
import { requireComprador } from "@/lib/comprador/auth";
import { getPerfil, getDirecciones } from "@/lib/comprador/perfil";
import { getPedidos } from "@/lib/comprador/pedidos";
import { cerrarSesionComprador } from "@/app/entrar/actions";

export const metadata: Metadata = { title: "Mi cuenta · Tlachiwalis" };

export default async function CuentaPage() {
  const { user } = await requireComprador();
  const [perfil, direcciones, pedidos] = await Promise.all([
    getPerfil(),
    getDirecciones(),
    getPedidos(),
  ]);

  const emailVerificado = Boolean((user as { email_confirmed_at?: string }).email_confirmed_at);
  const miembroDesde = user.created_at
    ? new Date(user.created_at).toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader alwaysSolid />
      <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-24 md:pt-32">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarIniciales nombre={perfil.nombre} apellido={perfil.apellido} avatarUrl={perfil.avatarUrl} size="sm" />
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ceniza">Mi cuenta</p>
              <h1 className="mt-1 font-display text-3xl sm:text-4xl">
                Hola{perfil.nombre ? `, ${perfil.nombre.split(" ")[0]}` : ""}
              </h1>
            </div>
          </div>
          <form action={cerrarSesionComprador}>
            <button
              type="submit"
              className="text-sm text-ceniza underline decoration-linea underline-offset-4 transition-colors hover:text-grana"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        <CuentaDashboard
          perfil={perfil}
          email={user.email ?? ""}
          emailVerificado={emailVerificado}
          miembroDesde={miembroDesde}
          direcciones={direcciones}
          pedidos={pedidos}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
