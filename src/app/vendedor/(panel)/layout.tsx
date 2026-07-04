import type { ReactNode } from "react";
import Link from "next/link";
import { requireVendedor } from "@/lib/vendedor/auth";
import { getMiArtesano } from "@/lib/vendedor/perfil";
import { VendedorNav } from "@/components/vendedor/vendedor-nav";
import { VendedorSignOutButton } from "@/components/vendedor/sign-out-button";
import { RecordatorioCobros } from "@/components/vendedor/recordatorio-cobros";

// Layout del panel de vendedor (artesano). Espejo del layout admin: mismo look
// claro "tarjetas cálidas" (card-warm, Space Grotesk / IBM Plex). requireVendedor()
// es la autoridad (redirige a /vendedor/login si no hay sesión válida de vendedor).
export default async function PanelVendedorLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireVendedor();
  const artesano = await getMiArtesano();

  return (
    <div className="panel min-h-screen bg-background font-admin text-foreground">
      <header className="sticky top-0 z-30 border-b border-tinto/12 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-6">
          <Link href="/vendedor" className="flex items-center gap-2.5">
            <span className="font-grotesk text-base font-bold tracking-tight text-foreground">
              Tlachiwalis
            </span>
            <span className="hidden rounded-full border border-tinto/20 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              Vendedor
            </span>
          </Link>

          <VendedorNav />

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-xs text-foreground/90">{artesano.nombre}</p>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                Tu taller
              </p>
            </div>
            <VendedorSignOutButton />
          </div>
        </div>
        {/* Recordatorio persistente de cobros: visible en todo el panel hasta habilitarlos. */}
        <RecordatorioCobros
          habilitado={artesano.cobros_habilitados}
          detallesEnviados={artesano.cobros_detalles_enviados}
        />
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
