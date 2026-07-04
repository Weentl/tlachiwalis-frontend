import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

/**
 * Callback OAuth (PKCE): Google → GoTrue → aquí con ?code=. Intercambia el code por la sesión y
 * setea las cookies, luego redirige a `next` (validado a ruta same-origin). Corre SIN sesión
 * previa (por eso /auth/callback NO está en el matcher del proxy). En error → /entrar?error=oauth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/cuenta";
  // Solo rutas relativas del propio sitio (anti open-redirect).
  const dest = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/cuenta";

  if (!code) return NextResponse.redirect(new URL("/entrar?error=oauth", origin));

  let response = NextResponse.redirect(new URL(dest, origin));
  const supabase = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(new URL(dest, origin));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/entrar?error=oauth", origin));
  return response;
}
