"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { estadoRegistro } from "@/app/vendedor/pendiente/actions";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Sala de espera: escucha en TIEMPO REAL su fila de artesano. Cuando el admin aprueba
 * (status → 'activo') manda al panel de inmediato, SIN pasar por login (la sesión ya existe
 * del registro). Un poll lento (20s) queda como respaldo por si Realtime no conecta.
 */
export function EsperaAprobacion({ artesanoId }: { artesanoId: string }) {
  const router = useRouter();

  useEffect(() => {
    let vivo = true;

    const revisar = async () => {
      try {
        const estado = await estadoRegistro();
        if (!vivo) return;
        if (estado === "activo") router.replace("/vendedor");
        else if (estado === "ninguno") router.replace("/vendedor/login");
      } catch {
        /* reintenta en el siguiente tick */
      }
    };

    const sb = supabaseBrowser();
    const canal = sb
      .channel(`artesano-${artesanoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "artesanos", filter: `id=eq.${artesanoId}` },
        (payload) => {
          const status = (payload.new as { status?: string })?.status;
          if (status === "activo" && vivo) router.replace("/vendedor");
        },
      )
      .subscribe();

    const id = setInterval(revisar, 3000); // respaldo confiable (el Realtime self-hosted puede no conectar desde el navegador)

    return () => {
      vivo = false;
      clearInterval(id);
      sb.removeChannel(canal);
    };
  }, [artesanoId, router]);

  return (
    <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <span className="h-2 w-2 animate-pulse rounded-full bg-tinto" aria-hidden />
      En revisión… te llevaremos a tu panel en cuanto se apruebe.
    </p>
  );
}
