import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="panel min-h-screen bg-background font-admin text-foreground">
      <header className="sticky top-0 z-30 border-b border-tinto/12 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="font-grotesk text-base font-bold tracking-tight text-foreground">
              Tlachiwalis
            </span>
            <span className="hidden rounded-full border border-tinto/20 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
              Admin
            </span>
          </Link>

          <AdminNav />

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-xs text-foreground/90">{user.email}</p>
              <p className="text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                Administrador
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
