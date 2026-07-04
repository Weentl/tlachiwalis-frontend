import { cerrarSesion } from "@/app/admin/login/actions";

export function SignOutButton() {
  return (
    <form action={cerrarSesion}>
      <button
        type="submit"
        className="rounded-ob-sm border border-tinto/20 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
      >
        Salir
      </button>
    </form>
  );
}
