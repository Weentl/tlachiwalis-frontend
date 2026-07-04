import { cerrarSesionVendedor } from "@/app/vendedor/login/actions";

// Igual que el SignOutButton del admin, pero invoca la acción del vendedor (que
// redirige a /vendedor/login en vez de /admin/login).
export function VendedorSignOutButton() {
  return (
    <form action={cerrarSesionVendedor}>
      <button
        type="submit"
        className="rounded-ob-sm border border-tinto/20 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
      >
        Salir
      </button>
    </form>
  );
}
