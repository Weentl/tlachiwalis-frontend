import { requireVendedor } from "@/lib/vendedor/auth";
import { getPedidosVendedor } from "@/lib/vendedor/pedidos";
import { PedidosVendedor } from "@/components/vendedor/pedidos-vendedor";
import { AutoRefresh } from "@/components/admin/auto-refresh";

export default async function VendedorPedidosPage() {
  await requireVendedor();
  const pedidos = await getPedidosVendedor();

  return (
    <div>
      <AutoRefresh />
      <header className="mb-6">
        <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirma, prepara y envía las piezas que te compraron. Marca la guía al despachar.
        </p>
      </header>
      <PedidosVendedor pedidos={pedidos} />
    </div>
  );
}
