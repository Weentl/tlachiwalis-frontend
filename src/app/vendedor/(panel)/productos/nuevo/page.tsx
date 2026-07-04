import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireVendedor } from "@/lib/vendedor/auth";
import { getMiArtesano } from "@/lib/vendedor/perfil";
import { misCategoriasConAtributos } from "@/lib/vendedor/taxonomia";
import { ProductoWizard } from "@/components/wizard/producto-wizard";
import { crearMiProductoWizard } from "../wizard-actions";

// Alta de pieza del VENDEDOR con el WIZARD (Fase 3). El artesano es IMPLÍCITO: la
// action crearMiProductoWizard impone artesano_id desde requireVendedor (anti-IDOR).
// Autollenamos región/oficio del perfil como defaults inteligentes.
export default async function NuevaMiPieza() {
  await requireVendedor();
  const [artesano, { categorias, defsPorCategoria }] = await Promise.all([
    getMiArtesano(),
    misCategoriasConAtributos(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <Link
          href="/vendedor/productos"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Mis piezas
        </Link>
        <h1 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-foreground">
          Nueva pieza
        </h1>
      </header>
      <div className="card-warm p-6">
        <ProductoWizard
          action={crearMiProductoWizard}
          rol="vendedor"
          categorias={categorias}
          defsPorCategoria={defsPorCategoria}
          defaults={{
            region: artesano.region ?? undefined,
            oficio: artesano.oficio ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
