"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
} from "@stripe/react-connect-js";
import { Loader2 } from "lucide-react";
import {
  obtenerClientSecretOnboarding,
  sincronizarCobros,
} from "@/app/vendedor/(panel)/cobros/actions";
import { BotonConectarCobros } from "./boton-conectar-cobros";

type Modo = "onboarding" | "gestion";

// Publishable key de la PLATAFORMA (no del artesano). Inlined por Next en build.
const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

function Cargando() {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-tinto" />
      Cargando el formulario seguro de Stripe…
    </div>
  );
}

function Fallback({ modo }: { modo: Modo }) {
  if (modo === "gestion") {
    return (
      <p className="text-sm text-muted-foreground">
        No pudimos cargar la edición de tus datos aquí. Vuelve a intentarlo más tarde.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        No pudimos cargar el formulario aquí. Puedes continuar en la página segura de Stripe:
      </p>
      <BotonConectarCobros label="Continuar en Stripe" />
    </div>
  );
}

function Embebido({ modo }: { modo: Modo }) {
  const router = useRouter();
  const [errored, setErrored] = useState(false);
  // loadConnectAndInitialize toca window: se llama UNA vez en el init perezoso de useState, y
  // solo tras montar en cliente (lo garantiza el gate `mounted`). El mismo client_secret sirve
  // para ambos componentes (onboarding y gestión).
  const [connectInstance] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: PK as string,
      fetchClientSecret: async () => {
        const res = await obtenerClientSecretOnboarding();
        if (res.error || !res.clientSecret) throw new Error(res.error ?? "stripe");
        return res.clientSecret;
      },
      // Marca Tlachiwalis mapeada a los tokens reales de globals.css. Stripe dibuja los inputs
      // de KYC/CLABE (compliant); aquí solo personalizamos el contenedor.
      appearance: {
        overlays: "dialog",
        variables: {
          colorPrimary: "#57211d", // tinto
          colorBackground: "#f7f1e6", // papel
          colorText: "#2b2118", // tinta
          colorSecondaryText: "#8c7c68", // ceniza
          colorDanger: "#9a2a22",
          colorBorder: "#d8c9ad",
          buttonPrimaryColorBackground: "#57211d",
          buttonPrimaryColorText: "#f7f1e6",
          buttonPrimaryColorBorder: "#57211d",
          actionPrimaryColorText: "#57211d",
          borderRadius: "0px", // el sistema usa --radius: 0
          fontSizeBase: "15px",
          spacingUnit: "9px",
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
        },
      },
    }),
  );

  if (errored) return <Fallback modo={modo} />;
  return (
    <ConnectComponentsProvider connectInstance={connectInstance}>
      {modo === "gestion" ? (
        <ConnectAccountManagement
          onLoadError={({ error }) => {
            console.error("[connect account-management]", error?.message ?? error);
            setErrored(true);
          }}
        />
      ) : (
        <ConnectAccountOnboarding
          onExit={() => {
            // onExit NO significa éxito (también dispara si sale a medias): releemos el estado
            // real desde Stripe y refrescamos. El webhook account.updated es la red de seguridad.
            void sincronizarCobros().finally(() => router.refresh());
          }}
          onLoadError={({ error }) => {
            console.error("[connect onboarding]", error?.message ?? error);
            setErrored(true); // cae al hosted
          }}
        />
      )}
    </ConnectComponentsProvider>
  );
}

/**
 * Onboarding / gestión de cobros EMBEBIDO (Stripe Connect embedded components) dentro de
 * /vendedor/cobros. `modo="onboarding"` = alta (ConnectAccountOnboarding); `modo="gestion"` =
 * el artesano MODIFICA sus datos ya conectados (ConnectAccountManagement). El formulario (KYC/
 * CLABE, dibujado y validado por Stripe) vive en NUESTRA página autenticada, con marca vía
 * `appearance`. Monta SOLO en cliente (gate `mounted`, porque loadConnectAndInitialize toca
 * window). Sin publishable key o ante error → cae al hosted (o nada, en gestión).
 */
export function OnboardingCobrosEmbebido({ modo = "onboarding" }: { modo?: Modo }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!PK) return modo === "gestion" ? null : <BotonConectarCobros label="Conectar cobros con Stripe" />;
  if (!mounted) return <Cargando />;
  return <Embebido modo={modo} />;
}
