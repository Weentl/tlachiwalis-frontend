import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

// En Next 16 `middleware` se renombró a `proxy` (runtime Node por defecto).
// Refresca la sesión Supabase y hace un gate OPTIMISTA de /admin y /vendedor. La
// autoridad real de autorización es requireAdmin()/requireVendedor() (cada
// page/action) + RLS en Postgres. `/unirse` (claim de invitación) NO se gatea:
// no está en el matcher, así que un artesano sin sesión puede reclamar su cuenta.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser(), o el
  // refresh de token se rompe. getUser() valida el JWT por red contra GoTrue.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (
    !user &&
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login")
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  if (
    !user &&
    pathname.startsWith("/vendedor") &&
    !pathname.startsWith("/vendedor/login")
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/vendedor/login";
    return NextResponse.redirect(loginUrl);
  }

  // /cuenta = panel del comprador: sin sesión → /entrar (gate optimista; la autoridad es
  // requireComprador() + RLS). /entrar y /registrarse quedan FUERA del matcher (anon).
  if (!user && pathname.startsWith("/cuenta")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/entrar";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Solo /admin y /vendedor usan sesión; el storefront público (y /unirse, el claim
// de invitación) es anon. Acotar el matcher evita validar la sesión en cada
// request público. Cubre también las Server Actions (son POST a esas rutas donde
// se usan). `/unirse` queda FUERA a propósito: su claim corre sin sesión previa.
export const config = {
  matcher: ["/admin/:path*", "/vendedor/:path*", "/cuenta/:path*"],
};
