"use client";
import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { reclamarInvitacion } from "@/app/unirse/actions";
import { TextField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/admin/types";

/**
 * Formulario público de "Únete a Tlachiwalis" (claim de invitación). El token
 * viaja en un hidden (viene del `?t=` del link). Reusa TextField/Button del
 * admin para el look "tarjeta cálida".
 *
 * Al crear la cuenta con éxito, el Server Action ya dejó la sesión iniciada:
 * empujamos al panel del vendedor. Si el auto-login falló (state.ok pero con
 * mensaje de "inicia sesión"), mostramos el mensaje sin redirigir.
 */
export function UnirseForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    reclamarInvitacion,
    {},
  );

  React.useEffect(() => {
    // Solo redirigimos en el camino feliz (cuenta creada + sesión iniciada).
    if (state.ok && state.message?.includes("Entrando")) {
      router.replace("/vendedor");
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <p
          className={
            state.ok
              ? "border border-tinto/30 bg-tinto/5 px-3 py-2 text-sm text-foreground"
              : "border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}

      <TextField
        label="Tu correo"
        name="email"
        type="email"
        required
        placeholder="tucorreo@ejemplo.com"
        hint="Con este correo entrarás a tu panel."
        error={state.errors?.email?.[0]}
      />
      <TextField
        label="Crea una contraseña"
        name="password"
        type="password"
        required
        hint="Mínimo 8 caracteres."
        error={state.errors?.password?.[0]}
      />
      <TextField
        label="Repite la contraseña"
        name="password2"
        type="password"
        required
        error={state.errors?.password2?.[0]}
      />

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="acepta"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-tinto/30 accent-tinto"
        />
        <span>
          Acepto los términos y el aviso de privacidad de Tlachiwalis.
        </span>
      </label>
      {state.errors?.acepta?.[0] ? (
        <p className="-mt-3 text-xs text-destructive" aria-live="polite">
          {state.errors.acepta[0]}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creando tu cuenta…" : "Crear mi cuenta"}
      </Button>
    </form>
  );
}
