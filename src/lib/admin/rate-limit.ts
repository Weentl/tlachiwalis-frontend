import "server-only";
import { headers } from "next/headers";

// Rate limiting en memoria para el login (defensa en profundidad sobre el rate
// limit propio de GoTrue). Nota: es por-instancia y se reinicia con el proceso;
// para multi-instancia o algo serio, usar GoTrue (GOTRUE_RATE_LIMIT_*) o Redis.
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_FALLOS = 8;

export async function clienteIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocido"
  );
}

export function estaBloqueado(ip: string): boolean {
  const b = store.get(ip);
  if (!b) return false;
  if (Date.now() > b.resetAt) {
    store.delete(ip);
    return false;
  }
  return b.count >= MAX_FALLOS;
}

export function registrarFallo(ip: string): void {
  const now = Date.now();
  const b = store.get(ip);
  if (!b || now > b.resetAt) {
    store.set(ip, { count: 1, resetAt: now + VENTANA_MS });
    return;
  }
  b.count += 1;
}

export function limpiarIntentos(ip: string): void {
  store.delete(ip);
}
