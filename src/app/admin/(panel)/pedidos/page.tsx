import { requireAdmin } from "@/lib/admin/auth";
import { getPedidosAdmin } from "@/lib/admin/pedidos";
import { PedidosAdmin } from "@/components/admin/pedidos-admin";
import { AutoRefresh } from "@/components/admin/auto-refresh";

export default async function AdminPedidosPage() {
  await requireAdmin();
  const pedidos = await getPedidosAdmin();

  return (
    <div>
      <AutoRefresh />
      <header className="mb-6">
        <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seguimiento de todos los envíos. Cada fila es lo que un taller debe preparar y enviar.
        </p>
      </header>
      <PedidosAdmin pedidos={pedidos} />
    </div>
  );
}
