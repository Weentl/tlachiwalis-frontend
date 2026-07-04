import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

/**
 * Cliente Supabase ligado a las cookies de la sesión (SSR), para Server
 * Components y Server Actions del panel admin. Porta el JWT del admin → RLS lo
 * ve como `authenticated` y `is_admin()` decide. NO usa service_role.
 *
 * `cookies()` es ASÍNCRONO en este Next (await obligatorio).
 */
export async function createAdminClient() {
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    // Endurecer las cookies de sesión: httpOnly (no legibles por JS → resiste XSS),
    // sameSite lax (anti-CSRF), y Secure en producción (HTTPS; en dev/localhost
    // HTTP debe ir sin Secure o el navegador no las guarda).
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Invocado desde el render de un Server Component (no se pueden
          // escribir cookies ahí). El proxy refresca la sesión, así que es
          // seguro ignorar este caso.
        }
      },
    },
  });
}
