import "server-only";
import { requireComprador } from "./auth";

export type PerfilComprador = {
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  avatarUrl: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  intereses: string[];
  comoConocio: string | null;
};

export type Direccion = {
  id: string;
  etiqueta: string | null;
  destinatario: string | null;
  telefono: string | null;
  calle: string | null;
  colonia: string | null;
  ciudad: string | null;
  estado: string | null;
  cp: string | null;
  referencias: string | null;
  esPrincipal: boolean;
};

export async function getPerfil(): Promise<PerfilComprador> {
  const { supabase, user } = await requireComprador();
  const { data } = await supabase
    .from("perfiles")
    .select("nombre,apellido,telefono,avatar_url,marketing_consent,marketing_consent_at,intereses,como_conocio")
    .eq("user_id", user.id)
    .maybeSingle();
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    nombre: (r.nombre as string) ?? null,
    apellido: (r.apellido as string) ?? null,
    telefono: (r.telefono as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    marketingConsent: Boolean(r.marketing_consent),
    marketingConsentAt: (r.marketing_consent_at as string) ?? null,
    intereses: Array.isArray(r.intereses) ? (r.intereses as string[]) : [],
    comoConocio: (r.como_conocio as string) ?? null,
  };
}

export async function getDirecciones(): Promise<Direccion[]> {
  const { supabase } = await requireComprador();
  const { data } = await supabase
    .from("direcciones")
    .select("*")
    .order("es_principal", { ascending: false })
    .order("created_at", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    etiqueta: (r.etiqueta as string) ?? null,
    destinatario: (r.destinatario as string) ?? null,
    telefono: (r.telefono as string) ?? null,
    calle: (r.calle as string) ?? null,
    colonia: (r.colonia as string) ?? null,
    ciudad: (r.ciudad as string) ?? null,
    estado: (r.estado as string) ?? null,
    cp: (r.cp as string) ?? null,
    referencias: (r.referencias as string) ?? null,
    esPrincipal: Boolean(r.es_principal),
  }));
}
