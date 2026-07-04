import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";

// Modelo 0013: el alta por FORMULARIO se retiró. El admin solo INVITA (genera un link) y
// el artesano se registra y llena TODOS sus datos desde el enlace. Esta ruta ya no aplica:
// redirige al listado, donde está el botón "Invitar artesano".
export default async function NuevoArtesano() {
  await requireAdmin();
  redirect("/admin/artesanos");
}
