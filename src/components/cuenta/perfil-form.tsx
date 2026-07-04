"use client";
import { useActionState } from "react";
import { actualizarPerfil } from "@/app/cuenta/actions";
import { Boton } from "@/components/ui/boton";
import { Campo, labelCls } from "./campo";
import { AvatarIniciales } from "./avatar-iniciales";
import { PerfilProgreso } from "./perfil-progreso";
import { ChipsIntereses } from "./chips-intereses";
import type { ActionState } from "@/lib/admin/types";
import type { PerfilComprador } from "@/lib/comprador/perfil";

export function PerfilForm({
  perfil,
  email,
  emailVerificado,
  miembroDesde,
}: {
  perfil: PerfilComprador;
  email: string;
  emailVerificado: boolean;
  miembroDesde: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actualizarPerfil, {});
  const e = (f: string) => state.errors?.[f]?.[0];
  const nombreCompleto = [perfil.nombre, perfil.apellido].filter(Boolean).join(" ");

  return (
    <div className="max-w-lg space-y-8">
      {/* Tarjeta de identidad */}
      <div className="rounded-[20px] border border-linea bg-lino p-6 shadow-pieza">
        <div className="flex items-start gap-4">
          <AvatarIniciales nombre={perfil.nombre} apellido={perfil.apellido} avatarUrl={perfil.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-tight text-tinta">
              {nombreCompleto || "Tu cuenta"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-tinta">{email}</span>
              {emailVerificado ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-jade/12 px-2 py-0.5 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-jade">
                  Verificado
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-ceniza">
              Con este correo inicias sesión. No se puede cambiar por ahora.
            </p>
            {miembroDesde ? (
              <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ceniza">
                En Tlachiwalis desde {miembroDesde}
              </p>
            ) : null}
          </div>
        </div>
        <PerfilProgreso perfil={perfil} />
      </div>

      {/* Formulario editable */}
      <form action={action} className="space-y-5">
        {state.message ? (
          <p
            className={
              state.ok
                ? "rounded-[12px] border border-jade/40 bg-jade/5 px-3.5 py-2.5 text-sm text-tinta"
                : "rounded-[12px] border border-destructive/40 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
            }
          >
            {state.message}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="nombre" autoComplete="given-name" defaultValue={perfil.nombre ?? ""} placeholder="Tu nombre" error={e("nombre")} />
          <Campo label="Apellido" name="apellido" autoComplete="family-name" defaultValue={perfil.apellido ?? ""} placeholder="Tu apellido" error={e("apellido")} />
        </div>
        <div>
          <Campo label="Teléfono" name="telefono" type="tel" autoComplete="tel" defaultValue={perfil.telefono ?? ""} error={e("telefono")} />
          <p className="mt-1 text-xs text-ceniza">Solo para avisos de entrega.</p>
        </div>

        <div>
          <p className={labelCls}>¿Qué te interesa?</p>
          <p className="mt-1 text-sm text-ceniza">Elige los oficios que quieres ver más.</p>
          <div className="mt-3">
            <ChipsIntereses seleccionados={perfil.intereses} />
          </div>
        </div>

        <Boton type="submit" disabled={pending} pill>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Boton>
      </form>
    </div>
  );
}
