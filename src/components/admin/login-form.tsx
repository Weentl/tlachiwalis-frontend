"use client";
import { useActionState } from "react";
import { iniciarSesion } from "@/app/admin/login/actions";
import { TextField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin/types";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    iniciarSesion,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <p
          className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}

      <TextField
        label="Correo"
        name="email"
        type="email"
        required
        placeholder="admin@glowel.com.mx"
        error={state.errors?.email?.[0]}
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        required
        error={state.errors?.password?.[0]}
      />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
