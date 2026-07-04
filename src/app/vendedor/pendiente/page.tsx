import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-server";
import { EsperaAprobacion } from "@/components/vendedor/espera-aprobacion";
import { VendedorSignOutButton } from "@/components/vendedor/sign-out-button";

export const metadata: Metadata = {
  title: "Solicitud enviada · Tlachiwalis",
  robots: { index: false, follow: false },
};

/**
 * Sala de espera tras el registro. NO está bajo (panel) para no chocar con requireVendedor.
 * Muestra "solicitud en revisión" y un poller que, al aprobar el admin (status='activo'),
 * manda al panel automáticamente sin pasar por login. Si ya está activo (p.ej. refrescó
 * después de la aprobación), redirige de una vez.
 */
export default async function PendientePage() {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/vendedor/login");

  const { data: art } = await supabase
    .from("artesanos")
    .select("id,status,nombre")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!art) redirect("/vendedor/login");
  const a = art as { id: string; status: string; nombre: string };
  if (a.status === "activo") redirect("/vendedor");
  if (a.status !== "pendiente") redirect("/vendedor/login");

  return (
    <main className="panel flex min-h-screen items-center justify-center bg-background px-6 py-10 font-admin text-foreground">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-ob bg-tinto text-[#f7f1e6]">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <rect x="1" y="1" width="6" height="6" rx="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" />
          </svg>
        </span>
        <h1 className="font-grotesk text-2xl font-bold tracking-tight text-foreground">
          ¡Solicitud enviada!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Gracias, {a.nombre}. Tu solicitud está en revisión del equipo de Tlachiwalis. En
          cuanto la aprueben entrarás a tu panel automáticamente; también te avisaremos.
        </p>

        <EsperaAprobacion artesanoId={a.id} />

        <div className="mt-8 border-t border-tinto/12 pt-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Puedes cerrar esta página; al volver e iniciar sesión seguirás aquí hasta que se
            apruebe tu solicitud.
          </p>
          <VendedorSignOutButton />
        </div>
      </div>
    </main>
  );
}
