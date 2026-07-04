import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { requireVendedor } from "@/lib/vendedor/auth";
import { listarMisProductos } from "@/lib/vendedor/productos";
import { fmtPesos } from "@/lib/admin/metrics";
import { FilterBar } from "@/components/admin/filter-bar";
import { OFICIOS, STATUS_PRODUCTO, opcionesDe } from "@/lib/admin/catalogos";
import type { ProductoStatus } from "@/lib/admin/types";

const dot: Record<ProductoStatus, string> = {
  publicado: "#57211d",
  borrador: "#8c7c68",
  agotado: "#9a2a22",
};
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] ?? "" : v ?? "").toString();

// Lista de piezas del vendedor. Espejo de la lista admin, PERO acotada a lo suyo
// (sin filtro por artesano — todas son suyas). Reusa FilterBar y catálogos.
export default async function MisPiezasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireVendedor();
  const sp = await searchParams;
  const todos = await listarMisProductos();

  const f = {
    q: one(sp.q).toLowerCase(),
    oficio: one(sp.oficio),
    status: one(sp.status),
  };
  let items = todos;
  if (f.oficio) items = items.filter((p) => p.oficio === f.oficio);
  if (f.status) items = items.filter((p) => p.status === f.status);
  if (f.q)
    items = items.filter(
      (p) =>
        p.nombre.toLowerCase().includes(f.q) ||
        (p.maker ?? "").toLowerCase().includes(f.q),
    );
  const filtrando = Object.values(f).some(Boolean);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">
            Mis piezas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtrando
              ? `${items.length} de ${todos.length} piezas`
              : `${todos.length} ${todos.length === 1 ? "pieza" : "piezas"}`}
          </p>
        </div>
        <Link
          href="/vendedor/productos/nuevo"
          className="inline-flex items-center gap-1.5 rounded-ob-sm bg-tinto px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
        >
          <Plus className="h-4 w-4" /> Nueva pieza
        </Link>
      </header>

      <FilterBar
        searchPlaceholder="Buscar por nombre o taller…"
        selects={[
          { name: "status", label: "Estatus", options: STATUS_PRODUCTO },
          { name: "oficio", label: "Oficio", options: opcionesDe(OFICIOS) },
        ]}
      />

      {items.length === 0 ? (
        <p className="card-warm px-5 py-14 text-center text-sm text-muted-foreground">
          {filtrando
            ? "No hay piezas que coincidan con los filtros."
            : "Aún no tienes piezas. Crea la primera."}
        </p>
      ) : (
        <div className="card-warm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tinto/12 text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Pieza</th>
                  <th className="px-4 py-3 font-medium">Oficio</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Estatus</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-tinto/10 transition-colors hover:bg-tinto/[0.02]"
                  >
                    <td className="px-4 py-2">
                      <div className="relative h-11 w-11 overflow-hidden rounded-ob-sm border border-tinto/15 bg-background">
                        {p.imagen ? (
                          <Image src={p.imagen} alt={p.nombre} fill sizes="44px" className="object-cover" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.oficio}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {fmtPesos(p.precio_centavos)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot[p.status] }} />
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/vendedor/productos/${p.id}`}
                        className="text-xs font-medium text-tinto hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
