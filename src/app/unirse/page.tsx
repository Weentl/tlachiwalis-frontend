import type { Metadata } from "next";
import { RegistroWizard } from "@/components/registro/registro-wizard";
import { hashToken } from "@/lib/vendedor/invitaciones";
import { supabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Únete a Tlachiwalis",
  description: "Crea tu cuenta de artesano con tu enlace de invitación.",
  robots: { index: false, follow: false },
};

const MENSAJES: Record<string, string> = {
  expirada: "Este enlace de invitación caducó. Pídele al equipo de Tlachiwalis uno nuevo.",
  revocada: "Este enlace fue revocado. Pídele al equipo de Tlachiwalis un enlace nuevo.",
  usada: "Este enlace ya se usó. Si ya tienes cuenta, inicia sesión.",
  invalida: "Este enlace no es válido o está incompleto. Pide tu enlace de invitación de nuevo.",
};

/**
 * Página pública del registro. El token viaja en `?t=`. Se valida su ESTADO en CADA carga
 * (vía RPC registro_invitacion_estado, 0016): si el admin lo revocó, o caducó, o ya se usó,
 * NO se renderiza el wizard y se muestra el motivo. Así, al refrescar con un link revocado,
 * ya no deja entrar. En Next 16 `searchParams` es asíncrono.
 */
export default async function UnirsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.t;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  let estado = "invalida";
  if (token.length >= 20) {
    if (!supabaseConfigured) {
      estado = "valida"; // dev sin Supabase: solo se valida la forma
    } else {
      const { data } = await supabaseServer().rpc("registro_invitacion_estado", {
        p_token_hash: hashToken(token),
      });
      estado = (data as string) ?? "invalida";
    }
  }
  const valido = estado === "valida";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 font-admin text-foreground">
      <div className="w-full max-w-xl">
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
            Únete a Tlachiwalis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {valido
              ? "Crea tu cuenta y arma tu página en el marketplace."
              : "Necesitas un enlace de invitación válido."}
          </p>
        </div>

        <div className="card-warm p-8">
          {valido ? (
            <RegistroWizard token={token} />
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {MENSAJES[estado] ?? MENSAJES.invalida}
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tlachiwalis es un marketplace por invitación. Si no tienes un enlace, escríbenos.
        </p>
      </div>
    </main>
  );
}
