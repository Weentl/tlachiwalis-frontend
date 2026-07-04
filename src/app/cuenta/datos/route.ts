import { requireComprador } from "@/lib/comprador/auth";
import { getPerfil, getDirecciones } from "@/lib/comprador/perfil";

// ARCO Acceso / portabilidad: el comprador descarga TODOS sus datos en JSON.
// requireComprador redirige a /entrar si no hay sesión (anti-acceso ajeno).
export async function GET() {
  const { user } = await requireComprador();
  const [perfil, direcciones] = await Promise.all([getPerfil(), getDirecciones()]);

  const payload = {
    exportado_en: new Date().toISOString(),
    cuenta: { id: user.id, email: user.email ?? null },
    perfil,
    direcciones,
    pedidos: [], // se poblará cuando exista el checkout
    nota: "Datos de tu cuenta en Tlachiwalis. Los datos de pago los trata Stripe; no se guardan aquí.",
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="mis-datos-tlachiwalis.json"',
      "cache-control": "no-store",
    },
  });
}
