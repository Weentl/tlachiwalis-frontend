import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getMiArtesano } from "@/lib/vendedor/perfil";
import { PerfilForm } from "@/components/vendedor/perfil-form";
import { actualizarMiPerfil } from "./actions";

// El artesano ve y edita TODA su información de registro + su página pública. Los datos
// fiscales/bancarios NO viven aquí: se administran en Stripe (tarjeta de abajo → /vendedor/cobros).
export default async function MiPerfilPage() {
  const artesano = await getMiArtesano();

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="font-grotesk text-2xl font-bold tracking-tight text-foreground">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aquí ves y editas toda tu información. Tus datos fiscales y bancarios se administran en
          Stripe (abajo).
        </p>
      </header>

      <div className="card-warm p-6">
        <PerfilForm action={actualizarMiPerfil} artesano={artesano} />
      </div>

      {/* Datos de cobro (Stripe) — se editan en /vendedor/cobros (componente embebido). */}
      <div className="mt-6 card-warm p-6">
        <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Datos de cobro (Stripe)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tus datos fiscales y bancarios (RFC, CLABE, verificación de identidad) se administran de
          forma segura en Stripe, no aquí.
          {artesano.cobros_habilitados
            ? " Puedes actualizarlos cuando lo necesites."
            : " Complétalos para poder publicar y vender."}
        </p>
        <Link
          href="/vendedor/cobros"
          className="mt-4 inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
        >
          {artesano.cobros_habilitados ? "Actualizar mis datos de cobro" : "Conectar mis cobros"}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
