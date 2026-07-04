import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getArtesano } from "@/lib/admin/artesanos";
import { contarPiezas } from "@/lib/admin/productos";
import { ArtesanoForm } from "@/components/admin/artesano-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { InvitarButton } from "@/components/admin/invitar-button";
import { Button } from "@/components/ui/button";
import {
  actualizarArtesano,
  eliminarArtesano,
  desactivarArtesano,
  reactivarArtesano,
} from "../../actions";

export default async function EditarArtesano({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const artesano = await getArtesano(id);
  if (!artesano) notFound();
  const piezas = await contarPiezas(id);

  // Estado directo del status (0014): 'pendiente' (en revisión), 'activo', o 'suspendido'
  // (status='pausado', suspendido por el admin p.ej. por hackeo).
  const estado: "pendiente" | "activo" | "suspendido" =
    artesano.status === "activo"
      ? "activo"
      : artesano.status === "pendiente"
        ? "pendiente"
        : "suspendido";
  const notaCuenta = artesano.user_id
    ? " Además se ELIMINA su cuenta de acceso (login)."
    : "";
  const confirmText =
    (piezas > 0
      ? `Vas a eliminar a ${artesano.nombre}. Sus ${piezas} pieza(s) NO se borran: pasan a "borrador" (salen del sitio) y quedan sin artesano asignado para reasignarlas o eliminarlas.`
      : `Vas a eliminar a ${artesano.nombre}. Esta acción no se puede deshacer.`) +
    notaCuenta +
    " ¿Continuar?";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <Link
          href={`/admin/artesanos/${id}`}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Ver artesano
        </Link>
        <h1 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-foreground">
          Editar: {artesano.nombre}
        </h1>
      </header>

      <div className="card-warm p-6">
        <ArtesanoForm action={actualizarArtesano} initial={artesano} submitLabel="Guardar cambios" />
      </div>

      <div className="mt-6">
        <InvitarButton
          artesanoId={artesano.id}
          artesanoNombre={artesano.nombre}
          yaVinculado={!!artesano.user_id}
        />
      </div>

      <div className="mt-6 card-warm p-6">
        <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
          Acceso y seguridad
        </h2>
        {estado === "pendiente" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>Pendiente</strong>: aparece inactivo hasta que el artesano abra su
            invitación y cree su cuenta por primera vez. Genera el enlace arriba y compártelo.
          </p>
        ) : estado === "suspendido" ? (
          <>
            <p className="mt-2 rounded-ob-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Acceso <strong>suspendido</strong>. Su cuenta no puede entrar al panel ni
              modificar sus piezas.
            </p>
            <div className="mt-4">
              <form action={reactivarArtesano}>
                <input type="hidden" name="id" value={artesano.id} />
                <Button type="submit" variant="outline">
                  Reactivar acceso
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Vuelve a habilitar su entrada al panel y su vitrina.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              <strong>Cuenta activa</strong>: puede entrar a su panel y administrar sus piezas.
            </p>
            <div className="mt-4">
              <form action={desactivarArtesano}>
                <input type="hidden" name="id" value={artesano.id} />
                <Button type="submit" variant="outline">
                  Suspender acceso
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Corta su entrada al panel al instante (útil si su cuenta fue comprometida). Es
                reversible; para baja definitiva usa “Eliminar artesano”.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-ob-sm border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-sm font-semibold text-foreground">Zona de peligro</h2>
        <p className="mb-4 mt-1 text-xs text-muted-foreground">
          {piezas > 0
            ? `Este artesano tiene ${piezas} pieza(s). Al eliminarlo se despublican y quedan sin asignar (no se pierden).`
            : "Eliminar al artesano de forma permanente."}
        </p>
        <DeleteButton action={eliminarArtesano} id={artesano.id} label="Eliminar artesano" confirmText={confirmText} />
      </div>
    </div>
  );
}
