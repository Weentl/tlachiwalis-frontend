"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para el NAVEGADOR (anon key + sesión por cookies). Se usa para
// suscripciones Realtime autenticadas (la RLS aplica: cada quien recibe cambios de las
// filas que puede leer). Nunca la service_role.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
