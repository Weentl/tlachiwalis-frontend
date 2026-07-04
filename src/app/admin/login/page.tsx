import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-server";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Acceso · Tlachiwalis",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const supabase = await createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: esAdmin } = await supabase.rpc("is_admin");
    if (esAdmin) redirect("/admin");
  }

  return (
    <main className="panel flex min-h-screen items-center justify-center bg-background px-6 font-admin text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-ob bg-tinto text-[#f7f1e6]">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" />
            </svg>
          </span>
          <h1 className="font-grotesk text-2xl font-bold tracking-tight text-foreground">
            Tlachiwalis Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceso al panel de control
          </p>
        </div>

        <div className="card-warm p-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso restringido al equipo de Tlachiwalis.
        </p>
      </div>
    </main>
  );
}
