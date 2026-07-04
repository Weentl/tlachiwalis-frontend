import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// La llave pública para el cliente. Aceptamos ambos nombres: el formato nuevo de
// Supabase la llama "publishable"; mantenemos "anon" como respaldo.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * Cliente de Supabase para lecturas públicas en el servidor (usa la anon key + RLS).
 * El admin (fase 2) usará un cliente con service_role aparte.
 */
export function supabaseServer() {
  return createClient(url!, anonKey!, { auth: { persistSession: false } });
}
