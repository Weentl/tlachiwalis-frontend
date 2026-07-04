"use client";
import { evaluarPassword, REQUISITOS_PASSWORD } from "@/lib/password-strength";

// Medidor visual + CHECKLIST de "caracteres a llevar". Guía de UX; la autoridad es el
// servidor (passwordFuerteSchema en el Server Action del registro).
const COLOR = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-tinto", "bg-tinto"];

export function MedidorPassword({ pwd, email }: { pwd: string; email?: string }) {
  const f = evaluarPassword(pwd, email);
  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < f.score ? COLOR[f.score] : "bg-tinto/15"}`}
          />
        ))}
      </div>
      {pwd ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Fuerza: <span className="font-medium text-foreground">{f.etiqueta}</span>
        </p>
      ) : null}
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {REQUISITOS_PASSWORD.map((r) => {
          const ok = r.re.test(pwd);
          return (
            <li key={r.txt} className={ok ? "text-tinto" : "text-muted-foreground"}>
              {ok ? "✓" : "○"} {r.txt}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
