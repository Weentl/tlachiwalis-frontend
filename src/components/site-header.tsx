"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { CartDrawer } from "@/components/cart-drawer";
import { cn } from "@/lib/utils";

// Nav del comprador: "Tienda" es el label que todos entienden (antes "Piezas").
const NAV = [
  { label: "Tienda", href: "/tienda", submenu: true },
  { label: "Artesanos", href: "/talleres" },
  { label: "Nuestra historia", href: "/marca" },
];

// Oficios del submenú de Tienda (con su región como dato mono).
const OFICIOS = [
  { nombre: "Talavera", region: "Puebla" },
  { nombre: "Barro negro", region: "Oaxaca" },
  { nombre: "Alebrijes", region: "Oaxaca" },
  { nombre: "Telar de cintura", region: "Chiapas" },
  { nombre: "Cestería", region: "Hidalgo" },
];

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden {...props}>
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" />
    </svg>
  );
}
function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
function IconBag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function SiteHeader({ alwaysSolid = false }: { alwaysSolid?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, openCart } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dSolid = alwaysSolid || scrolled || searchOpen;
  const sh = "[text-shadow:0_1px_10px_rgba(0,0,0,0.5)]";
  const onHero = !dSolid;
  const txt = onHero ? `text-tinta md:text-white ${sh}` : "text-tinta";
  const iconBtn = "grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-arena/50";

  const isActive = (href: string) => {
    if (href === "/tienda") return pathname === "/tienda" || pathname.startsWith("/tienda/");
    if (href === "/talleres") return pathname.startsWith("/talleres") || pathname.startsWith("/taller/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  const closeMobile = (e: React.MouseEvent) =>
    (e.currentTarget as HTMLElement).closest("details")?.removeAttribute("open");

  // Link de nav con estado activo (puntada grana + aria-current).
  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("relative transition-opacity hover:opacity-70", active && "font-medium")}
      >
        {label}
        {active ? <span className="hilo absolute -bottom-1.5 left-0 right-0" /> : null}
      </Link>
    );
  };

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-linea bg-cal/95 backdrop-blur transition-colors duration-300",
          onHero && "md:border-transparent md:bg-transparent md:backdrop-blur-none",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 md:h-20 md:px-6">
          <Link
            href="/"
            className={cn(
              "font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]",
              onHero ? `text-tinta md:text-white md:${sh}` : "text-tinta",
            )}
          >
            Tlachiwalis
          </Link>

          {/* Nav de escritorio */}
          <nav className={cn("ml-8 hidden items-center gap-8 text-[0.95rem] md:flex", txt)}>
            {/* Tienda + submenú de oficios */}
            <div className="group relative">
              <Link
                href="/tienda"
                aria-current={isActive("/tienda") ? "page" : undefined}
                className={cn("relative flex items-center gap-1 transition-opacity hover:opacity-70", isActive("/tienda") && "font-medium")}
              >
                Tienda
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="mt-0.5 opacity-70"><path d="M6 9l6 6 6-6" /></svg>
                {isActive("/tienda") ? <span className="hilo absolute -bottom-1.5 left-0 right-4" /> : null}
              </Link>
              {/* Panel */}
              <div className="invisible absolute left-0 top-full pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="w-64 rounded-[16px] border border-linea bg-lino p-3 text-tinta shadow-alto">
                  <p className="px-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-ceniza">Por oficio</p>
                  <div className="mt-1.5 space-y-0.5">
                    {OFICIOS.map((o) => (
                      <Link
                        key={o.nombre}
                        href={`/tienda?oficio=${encodeURIComponent(o.nombre)}`}
                        className="flex items-center justify-between rounded-[10px] px-2 py-2 text-sm transition-colors hover:bg-arena/60"
                      >
                        <span>{o.nombre}</span>
                        <span className="font-mono text-[0.58rem] uppercase tracking-wide text-ceniza">{o.region}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-linea px-2 pt-2.5">
                    <Link href="/tienda" className="text-sm font-medium text-grana hover:underline">
                      Ver toda la tienda →
                    </Link>
                    <Link href="/tienda?tipo=unico" className="font-mono text-[0.58rem] uppercase tracking-wide text-ceniza transition-colors hover:text-grana">
                      Únicas
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {NAV.slice(1).map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} />
            ))}
          </nav>

          {/* Acciones */}
          <div className={cn("ml-auto flex items-center gap-1", txt)}>
            <div className="hidden items-center md:flex">
              {searchOpen ? (
                <form action="/tienda" className="flex items-center">
                  <input
                    autoFocus
                    name="buscar"
                    placeholder="Buscar piezas, talleres…"
                    aria-label="Buscar"
                    className="h-10 w-56 rounded-full border border-linea bg-lino px-4 text-sm text-tinta placeholder:text-ceniza focus:border-grana focus:outline-none"
                    onBlur={(e) => {
                      // Solo cerrar si está vacío (no perder lo tecleado).
                      if (!e.currentTarget.value.trim()) setSearchOpen(false);
                    }}
                  />
                </form>
              ) : (
                <button type="button" aria-label="Buscar" onClick={() => setSearchOpen(true)} className={iconBtn}>
                  <IconSearch />
                </button>
              )}
            </div>

            <Link href="/cuenta" aria-label="Mi cuenta" className={cn(iconBtn, "hidden md:grid")}>
              <IconUser />
            </Link>

            <button
              type="button"
              aria-label={`Carrito${count > 0 ? `, ${count} piezas` : ""}`}
              onClick={openCart}
              className={cn(iconBtn, "relative")}
            >
              <IconBag />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-grana px-1 font-sans text-[0.65rem] font-semibold tabular-nums text-[#FFF7EE]">
                  {count}
                </span>
              ) : null}
            </button>

            {/* Menú móvil */}
            <details className="group md:hidden">
              <summary className={cn(iconBtn, "cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                <svg className="group-open:hidden" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                <svg className="hidden group-open:block" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5L5 19" /></svg>
              </summary>
              <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-linea bg-cal px-6 pb-9 pt-6">
                <form action="/tienda" className="mb-6">
                  <input name="buscar" placeholder="Buscar piezas, talleres…" aria-label="Buscar" className="h-11 w-full rounded-full border border-linea bg-lino px-4 text-sm text-tinta placeholder:text-ceniza focus:border-grana focus:outline-none" />
                </form>
                <nav className="flex flex-col gap-4">
                  <Link href="/tienda" onClick={closeMobile} className="font-display text-2xl text-tinta">Tienda</Link>
                  <div className="-mt-1 flex flex-wrap gap-x-4 gap-y-1.5 pl-1">
                    {OFICIOS.map((o) => (
                      <Link key={o.nombre} href={`/tienda?oficio=${encodeURIComponent(o.nombre)}`} onClick={closeMobile} className="text-sm text-ceniza transition-colors hover:text-grana">
                        {o.nombre}
                      </Link>
                    ))}
                  </div>
                  <Link href="/talleres" onClick={closeMobile} className="font-display text-2xl text-tinta">Artesanos</Link>
                  <Link href="/marca" onClick={closeMobile} className="font-display text-2xl text-tinta">Nuestra historia</Link>
                  <Link href="/cuenta" onClick={closeMobile} className="mt-2 flex items-center gap-2.5 font-display text-2xl text-tinta">
                    <IconUser className="text-grana" /> Mi cuenta
                  </Link>
                </nav>
              </div>
            </details>
          </div>
        </div>
      </header>

      <CartDrawer />
    </>
  );
}
