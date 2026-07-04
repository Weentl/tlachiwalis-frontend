import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getProductoAdmin, getVariantes, getGaleria } from "@/lib/admin/productos";
import { categoriasConAtributos } from "@/lib/admin/taxonomia";
import { EditarTabs } from "@/components/wizard/editar-tabs";
import { DeleteButton } from "@/components/admin/delete-button";
import { eliminarProducto } from "../actions";
import {
  actualizarBasico,
  actualizarAtributos,
  guardarVariantes,
  guardarGaleria,
  actualizarEnvio,
  publicarProducto,
  despublicarProducto,
} from "../wizard-actions";

// EDICIÓN (ADMIN) con pestañas de acceso aleatorio (Fase 3). Reemplaza el form
// plano. Cada pestaña guarda con su Server Action de update parcial + optimistic
// lock por updated_at. Reusa EditarTabs (comparte componentes con el wizard).
export default async function EditarPieza({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [producto, variantes, galeria, { categorias, defsPorCategoria }] =
    await Promise.all([
      getProductoAdmin(id),
      getVariantes(id),
      getGaleria(id),
      categoriasConAtributos(),
    ]);
  if (!producto) notFound();

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
          {producto.nombre}
        </h1>
      </header>

      <EditarTabs
        rol="admin"
        producto={producto}
        categorias={categorias}
        defsPorCategoria={defsPorCategoria}
        variantes={variantes}
        galeria={galeria}
        acciones={{
          basico: actualizarBasico,
          atributos: actualizarAtributos,
          variantes: guardarVariantes,
          galeria: guardarGaleria,
          envio: actualizarEnvio,
          publicar: publicarProducto,
          despublicar: despublicarProducto,
        }}
      />

      <div className="mt-6 rounded-ob-sm border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-sm font-semibold text-foreground">Zona de peligro</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">
          Eliminar la pieza también borra sus fotos del almacenamiento. No se puede deshacer.
        </p>
        <DeleteButton
          action={eliminarProducto}
          id={producto.id}
          label="Eliminar pieza"
          confirmText={`Vas a eliminar "${producto.nombre}". Esta acción no se puede deshacer. ¿Continuar?`}
        />
      </div>
    </div>
  );
}
