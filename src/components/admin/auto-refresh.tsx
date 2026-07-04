"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

// TIEMPO REAL en el panel admin: se suscribe a cambios de artesanos (solicitudes) e
// invitaciones (links) → reejecuta las lecturas del server component al instante. Un poll
// lento (30s) queda de respaldo por si Realtime no conecta.
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser();
    const canal = sb
      .channel("admin-artesanos-invitaciones")
      .on("postgres_changes", { event: "*", schema: "public", table: "artesanos" }, () =>
        router.refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "invitaciones" }, () =>
        router.refresh(),
      )
      .subscribe();

    const id = setInterval(() => router.refresh(), 30000);

    return () => {
      clearInterval(id);
      sb.removeChannel(canal);
    };
  }, [router]);
  return null;
}
