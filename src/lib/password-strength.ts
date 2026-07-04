import { z } from "zod";

// Evaluador de fuerza de contraseña — PURO y client-safe (para el medidor del registro).
// La AUTORIDAD es el servidor: `passwordFuerteSchema` (abajo) se valida en el Server Action
// del registro; el medidor es solo la guía visual (checklist de "caracteres a llevar").

const COMUNES = new Set([
  "password", "contrasena", "contraseña", "123456", "12345678", "qwerty",
  "111111", "abc123", "tlachiwalis", "artesano", "mexico",
]);

export type FuerzaPassword = {
  score: 0 | 1 | 2 | 3 | 4;
  etiqueta: string;
  ok: boolean;
  faltantes: string[];
};

const ETIQUETAS = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Excelente"] as const;

export function evaluarPassword(pwd: string, email?: string): FuerzaPassword {
  const reglas = [
    { ok: pwd.length >= 8, txt: "8+ caracteres" },
    { ok: /[a-z]/.test(pwd), txt: "una minúscula" },
    { ok: /[A-Z]/.test(pwd), txt: "una mayúscula" },
    { ok: /[0-9]/.test(pwd), txt: "un número" },
    { ok: /[^A-Za-z0-9]/.test(pwd), txt: "un símbolo" },
  ];
  const faltantes = reglas.filter((r) => !r.ok).map((r) => r.txt);

  const localEmail = email?.split("@")[0]?.toLowerCase() ?? "";
  const comun =
    pwd.length > 0 &&
    (COMUNES.has(pwd.toLowerCase()) ||
      (localEmail.length >= 3 && pwd.toLowerCase().includes(localEmail)));
  if (comun) faltantes.push("evita palabras comunes o tu correo");

  const cumplidas = reglas.filter((r) => r.ok).length;
  let score: number;
  if (pwd.length === 0) score = 0;
  else if (comun) score = Math.min(1, cumplidas);
  else if (cumplidas <= 2) score = 1;
  else if (cumplidas === 3) score = 2;
  else if (cumplidas === 4) score = 3;
  else score = 4; // 5 reglas + 12 chars podría subir, pero 4 = "Excelente" ya es tope
  if (score === 4 && pwd.length < 12) score = 3; // pide longitud para el tope

  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    etiqueta: ETIQUETAS[score as 0 | 1 | 2 | 3 | 4],
    ok: faltantes.length === 0,
    faltantes,
  };
}

// Los requisitos "duros" que exige el SERVIDOR (mismas reglas que el medidor). El registro
// (y el claim) validan con esto ANTES de crear la cuenta; GoTrue es el último respaldo.
export const REQUISITOS_PASSWORD = [
  { txt: "8+ caracteres", re: /.{8,}/ },
  { txt: "una minúscula", re: /[a-z]/ },
  { txt: "una mayúscula", re: /[A-Z]/ },
  { txt: "un número", re: /[0-9]/ },
  { txt: "un símbolo", re: /[^A-Za-z0-9]/ },
] as const;

export const passwordFuerteSchema = z
  .string()
  .max(72, "Máximo 72 caracteres") // límite bcrypt de GoTrue
  .refine((p) => REQUISITOS_PASSWORD.every((r) => r.re.test(p)), {
    message: "La contraseña debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo.",
  })
  .refine((p) => !COMUNES.has(p.toLowerCase()), {
    message: "Evita contraseñas comunes.",
  });
