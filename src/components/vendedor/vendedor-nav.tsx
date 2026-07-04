"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Espejo de AdminNav pero acotado a las rutas del vendedor. Se mantiene aparte
// porque los destinos y las etiquetas difieren; el marcado/estilo es idéntico.
const items = [
  { href: "/vendedor", label: "Inicio" },
  { href: "/vendedor/productos", label: "Mis piezas" },
  { href: "/vendedor/cobros", label: "Cobros" },
  { href: "/vendedor/perfil", label: "Mi perfil" },
];

export function VendedorNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((it) => {
        const active =
          it.href === "/vendedor"
            ? pathname === "/vendedor"
            : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "rounded-ob-sm px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-tinto/8 text-tinto"
                : "text-muted-foreground hover:bg-tinto/5 hover:text-foreground",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
