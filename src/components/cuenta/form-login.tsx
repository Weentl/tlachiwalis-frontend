"use client";
import { useActionState } from "react";
import { iniciarSesionComprador } from "@/app/entrar/actions";
import { Boton } from "@/components/ui/boton";
import { Campo } from "./campo";
import type { ActionState } from "@/lib/admin/types";

export function FormLogin() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    iniciarSesionComprador,
    {},
  );
  const e = (f: string) => state.errors?.[f]?.[0];

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <p className="rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Campo label="Correo" name="email" type="email" autoComplete="email" required error={e("email")} />
      <Campo label="Contraseña" name="password" type="password" autoComplete="current-password" required error={e("password")} />

      <Boton type="submit" disabled={pending} size="lg" pill className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Boton>
    </form>
  );
}
