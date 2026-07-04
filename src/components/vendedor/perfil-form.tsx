"use client";
import { type ReactNode, useActionState, useState } from "react";
import { SelectField, TextField, TextareaField } from "@/components/admin/fields";
import { ImageUpload } from "@/components/admin/image-upload";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OFICIOS, opcionesDe } from "@/lib/admin/catalogos";
import type { ActionState } from "@/lib/admin/types";
import type { MiArtesano } from "@/lib/vendedor/perfil";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const TIPOS = [
  { value: "persona", label: "Persona (por cuenta propia)" },
  { value: "taller", label: "Taller / colectivo" },
  { value: "tienda", label: "Tienda" },
] as const;

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-tinto/10 pt-5 first:border-0 first:pt-0">
      <legend className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export function PerfilForm({ action, artesano }: { action: Action; artesano: MiArtesano }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [tipo, setTipo] = useState<string>(artesano.tipo_vendedor ?? "persona");
  const e = (f: string) => state.errors?.[f]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="foto_url" value={artesano.foto_url ?? ""} />

      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-ob-sm border border-tinto/30 bg-tinto/5 px-3 py-2 text-sm text-foreground"
              : "rounded-ob-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <Seccion titulo="Tus datos">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre(s)" name="nombres" required defaultValue={artesano.nombres} error={e("nombres")} />
          <TextField label="Apellido paterno" name="apellidoP" required defaultValue={artesano.apellido_paterno} error={e("apellidoP")} />
          <TextField label="Apellido materno" name="apellidoM" defaultValue={artesano.apellido_materno} error={e("apellidoM")} />
          <TextField label="Teléfono" name="telefono" type="tel" inputMode="numeric" defaultValue={artesano.telefono} hint="10 dígitos" error={e("telefono")} />
          <TextField label="Fecha de nacimiento" name="fechaNac" type="date" defaultValue={artesano.fecha_nacimiento} error={e("fechaNac")} />
        </div>
      </Seccion>

      <Seccion titulo="Cómo vendes">
        <div>
          <Label htmlFor="tipoVendedor">Modalidad</Label>
          <select
            id="tipoVendedor"
            name="tipoVendedor"
            value={tipo}
            onChange={(ev) => setTipo(ev.target.value)}
            className="mt-1.5 w-full rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 focus:bg-card [&>option]:bg-card [&>option]:text-foreground"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Solo taller/tienda: nombre del negocio; solo taller: personas. Persona = ocultos. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {tipo !== "persona" ? (
            <TextField
              label={tipo === "tienda" ? "Nombre de la tienda" : "Nombre del taller"}
              name="nombreNegocio"
              defaultValue={artesano.nombre_negocio}
              error={e("nombreNegocio")}
            />
          ) : null}
          {tipo === "taller" ? (
            <TextField
              label="Personas en el taller"
              name="numPersonas"
              type="number"
              inputMode="numeric"
              defaultValue={artesano.num_personas != null ? String(artesano.num_personas) : ""}
              error={e("numPersonas")}
            />
          ) : null}
          <TextField
            label="Años de experiencia"
            name="aniosExp"
            type="number"
            inputMode="numeric"
            defaultValue={artesano.anios_experiencia != null ? String(artesano.anios_experiencia) : ""}
            error={e("aniosExp")}
          />
        </div>
      </Seccion>

      <Seccion titulo="Ubicación y envíos">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Estado / región" name="region" defaultValue={artesano.region} error={e("region")} />
          <TextField label="Ciudad" name="ciudad" defaultValue={artesano.direccion?.ciudad ?? ""} error={e("ciudad")} />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-foreground">
          <input type="checkbox" name="enviaNacional" defaultChecked={!!artesano.envia_nacional} className="h-4 w-4 rounded border-tinto/30 text-tinto accent-tinto" />
          Hago envíos a todo el país
        </label>
      </Seccion>

      <Seccion titulo="Tu página pública">
        <SelectField label="Tu oficio" name="oficio" defaultValue={artesano.oficio ?? ""} options={opcionesDe(OFICIOS)} placeholder="Elige tu oficio…" error={e("oficio")} />
        <TextareaField label="Tu historia (semblanza)" name="semblanza" defaultValue={artesano.semblanza ?? undefined} hint="Cuenta quién eres y cómo trabajas. Aparece en tu página pública." error={e("semblanza")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Instagram" name="instagram" defaultValue={artesano.redes?.instagram ?? ""} placeholder="@tucuenta" error={e("instagram")} />
          <TextField label="Sitio web" name="sitio" type="url" defaultValue={artesano.redes?.sitio ?? ""} placeholder="https://…" error={e("sitio")} />
        </div>
        <ImageUpload name="foto" label="Tu foto" initial={artesano.foto_url} hint="JPG, PNG o WebP, máximo 5 MB." />
      </Seccion>

      <div className="pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar mi perfil"}
        </Button>
      </div>
    </form>
  );
}
