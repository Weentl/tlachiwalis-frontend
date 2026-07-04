import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireVendedor } from "@/lib/vendedor/auth";
import { getMiProducto, getMisVariantes, getMiGaleria } from "@/lib/vendedor/productos";
import { misCategoriasConAtributos } from "@/lib/vendedor/taxonomia";
import { EditarTabs } from "@/components/wizard/editar-tabs";
import { DeleteButton } from "@/components/admin/delete-button";
import { eliminarMiProducto } from "../actions";
import {
  actualizarMiBasico,
  actualizarMisAtributos,
  guardarMisVariantes,
  guardarMiGaleria,
  actualizarMiEnvio,
  publicarMiProducto,
  despublicarMiProducto,
} from "../wizard-actions";

// EDICIÓN de una pieza del VENDEDOR con pestañas (Fase 3). getMiProducto y sus
// hermanos ya acotan por dueño (anti-IDOR en la app, además de la RLS). Cada
// pestaña guarda con su Server Action; el ctx del vendedor fuerza artesano_id.
export default async function EditarMiPieza({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireVendedor();
  const { id } = await params;
  const [producto, variantes, galeria, { categorias, defsPorCategoria }] =
    await Promise.all([
      getMiProducto(id),
      getMisVariantes(id),
      getMiGaleria(id),
      misCategoriasConAtributos(),
    ]);
  if (!producto) notFound();

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
          {producto.nombre}
        </h1>
      </header>

      <EditarTabs
        rol="vendedor"
        producto={producto}
        categorias={categorias}
        defsPorCategoria={defsPorCategoria}
        variantes={variantes}
        galeria={galeria}
        acciones={{
          basico: actualizarMiBasico,
          atributos: actualizarMisAtributos,
          variantes: guardarMisVariantes,
          galeria: guardarMiGaleria,
          envio: actualizarMiEnvio,
          publicar: publicarMiProducto,
          despublicar: despublicarMiProducto,
        }}
      />

      <div className="mt-6 rounded-ob-sm border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-sm font-semibold text-foreground">Zona de peligro</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">
          Eliminar la pieza también borra sus fotos del almacenamiento. No se puede deshacer.
        </p>
        <DeleteButton
          action={eliminarMiProducto}
          id={producto.id}
          label="Eliminar pieza"
          confirmText={`Vas a eliminar "${producto.nombre}". Esta acción no se puede deshacer. ¿Continuar?`}
        />
      </div>
    </div>
  );
}
