"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { registrarComprador } from "@/app/registrarse/actions";
import { MedidorPassword } from "@/components/registro/medidor-password";
import { Boton } from "@/components/ui/boton";
import { Campo, inputCls, labelCls } from "./campo";
import type { ActionState } from "@/lib/admin/types";

export function FormRegistro() {
  const [state, action, pending] = useActionState<ActionState, FormData>(registrarComprador, {});
  const [pwd, setPwd] = useState("");
  const [email, setEmail] = useState("");
  const e = (f: string) => state.errors?.[f]?.[0];

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <p className="rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className={labelCls}>
          Correo *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required
          autoComplete="email"
          className={inputCls}
        />
        {e("email") ? <p className="mt-1 text-sm text-destructive">{e("email")}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className={labelCls}>
          Contraseña *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={pwd}
          onChange={(ev) => setPwd(ev.target.value)}
          required
          autoComplete="new-password"
          className={inputCls}
        />
        <MedidorPassword pwd={pwd} email={email} />
        {e("password") ? <p className="mt-1 text-sm text-destructive">{e("password")}</p> : null}
      </div>

      <Campo
        label="¿Cómo te llamamos? (opcional)"
        name="nombre"
        autoComplete="name"
        placeholder="Tu nombre"
        error={e("nombre")}
      />

      {/* Consentimientos LFPDPPP — separados y NO premarcados. */}
      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 text-sm text-tinta">
          <input
            type="checkbox"
            name="acepto"
            className="mt-0.5 h-4 w-4 shrink-0 accent-grana"
          />
          <span>
            Acepto el{" "}
            <Link
              href="/aviso-de-privacidad"
              className="text-grana underline decoration-grana/40 underline-offset-2 hover:decoration-grana"
            >
              Aviso de Privacidad
            </Link>{" "}
            y los Términos.
          </span>
        </label>
        {e("acepto") ? <p className="text-sm text-destructive">{e("acepto")}</p> : null}

        <label className="flex items-start gap-3 text-sm text-ceniza">
          <input
            type="checkbox"
            name="marketing"
            className="mt-0.5 h-4 w-4 shrink-0 accent-grana"
          />
          <span>Quiero recibir novedades y ediciones de talleres por correo. (opcional)</span>
        </label>
      </div>

      <Boton type="submit" disabled={pending} size="lg" pill className="w-full">
        {pending ? "Creando…" : "Crear cuenta"}
      </Boton>

      <p className="text-xs leading-relaxed text-ceniza">
        Solo tu correo para empezar. No pedimos tu tarjeta hasta el pago.
      </p>
    </form>
  );
}
