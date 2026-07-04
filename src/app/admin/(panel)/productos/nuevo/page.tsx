import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { listarArtesanosOpciones } from "@/lib/admin/artesanos";
import { categoriasConAtributos } from "@/lib/admin/taxonomia";
import { ProductoWizard } from "@/components/wizard/producto-wizard";
import { crearProductoWizard } from "../wizard-actions";

// Alta de pieza (ADMIN) con el WIZARD guiado por categoría (Fase 3). Reemplaza el
// form plano ProductoForm. La action crearProductoWizard construye un WizardCtx de
// admin y escribe producto + variante(s) + inventario + imágenes atómicamente
// (con compensación). El admin elige el artesano dueño en el Paso 1.
export default async function NuevaPieza() {
  await requireAdmin();
  const [artesanos, { categorias, defsPorCategoria }] = await Promise.all([
    listarArtesanosOpciones(),
    categoriasConAtributos(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <Link
          href="/admin/productos"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Piezas
        </Link>
        <h1 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-foreground">
          Nueva pieza
        </h1>
      </header>
      <div className="card-warm p-6">
        <ProductoWizard
          action={crearProductoWizard}
          rol="admin"
          categorias={categorias}
          defsPorCategoria={defsPorCategoria}
          artesanos={artesanos}
        />
      </div>
    </div>
  );
}
