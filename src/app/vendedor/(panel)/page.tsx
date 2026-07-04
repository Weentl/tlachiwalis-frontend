import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Package,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { requireVendedor } from "@/lib/vendedor/auth";
import { listarMisProductos } from "@/lib/vendedor/productos";
import { getMiArtesano } from "@/lib/vendedor/perfil";
import { fmtPesos } from "@/lib/admin/metrics";
import { StatCard } from "@/components/admin/stat-card";
import type { ProductoStatus } from "@/lib/admin/types";

const dot: Record<ProductoStatus, string> = {
  publicado: "#57211d",
  borrador: "#8c7c68",
  agotado: "#9a2a22",
};

// Dashboard del vendedor: métricas SIMPLES de su propio catálogo (sin ventas
// simuladas; los pagos/ventas llegan en fase 6 con Stripe Connect).
export default async function VendedorInicio() {
  await requireVendedor();
  const [productos, artesano] = await Promise.all([
    listarMisProductos(),
    getMiArtesano(),
  ]);

  const publicadas = productos.filter((p) => p.status === "publicado").length;
  const borradores = productos.filter((p) => p.status === "borrador").length;
  const agotadas = productos.filter((p) => p.status === "agotado").length;
  const valorCatalogo = productos
    .filter((p) => p.status === "publicado")
    .reduce((s, p) => s + p.precio_centavos, 0);

  const recientes = [...productos]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-barro">
            Tu taller
          </p>
          <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">
            Hola, {artesano.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Este es el resumen de tus piezas en Tlachiwalis.
          </p>
        </div>
        <Link
          href="/vendedor/productos/nuevo"
          className="inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
        >
          <Plus className="h-4 w-4" /> Nueva pieza
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Piezas en total" value={productos.length.toLocaleString("es-MX")} icon={<Package className="h-4 w-4" />} color="#57211d" />
        <StatCard label="Publicadas" value={publicadas.toLocaleString("es-MX")} icon={<CheckCircle2 className="h-4 w-4" />} color="#3f7a4f" />
        <StatCard label="Borradores" value={borradores.toLocaleString("es-MX")} icon={<FileEdit className="h-4 w-4" />} color="#8c7c68" />
        <StatCard label="Valor publicado" value={fmtPesos(valorCatalogo)} icon={<ArrowUpRight className="h-4 w-4" />} color="#a8761f" />
      </div>

      {agotadas > 0 ? (
        <div className="card-warm flex items-center gap-2.5 border-destructive/20 bg-destructive/[0.03] px-5 py-3.5 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          Tienes {agotadas} {agotadas === 1 ? "pieza agotada" : "piezas agotadas"}.{" "}
          <Link href="/vendedor/productos?status=agotado" className="font-medium text-tinto hover:underline">
            Revisar
          </Link>
        </div>
      ) : null}

      <section className="card-warm overflow-hidden">
        <div className="flex items-center justify-between border-b border-tinto/10 px-6 py-4">
          <h2 className="font-grotesk text-base font-semibold text-foreground">
            Piezas recientes
          </h2>
          <Link href="/vendedor/productos" className="text-xs font-medium text-tinto hover:underline">
            Ver todas
          </Link>
        </div>

        {recientes.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no tienes piezas. Sube la primera para que aparezca en la tienda.
            </p>
            <Link
              href="/vendedor/productos/nuevo"
              className="mt-4 inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
            >
              <Plus className="h-4 w-4" /> Crear mi primera pieza
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-tinto/10">
            {recientes.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/vendedor/productos/${p.id}`}
                  className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-tinto/[0.02]"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-ob-sm border border-tinto/15 bg-background">
                    {p.imagen ? (
                      <Image src={p.imagen} alt={p.nombre} fill sizes="44px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.oficio}</p>
                  </div>
                  <span className="hidden tabular-nums text-sm text-foreground sm:block">
                    {fmtPesos(p.precio_centavos)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot[p.status] }} />
                    {p.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
