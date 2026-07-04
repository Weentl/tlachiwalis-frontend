"use client";
import { useActionState, useState } from "react";
import {
  TextField,
  TextareaField,
  SelectField,
} from "@/components/admin/fields";
import { ImageUpload } from "@/components/admin/image-upload";
import { EnlaceInvitacionModal } from "@/components/admin/enlace-invitacion-modal";
import { Button } from "@/components/ui/button";
import { ESTADOS_MX, OFICIOS, opcionesDe } from "@/lib/admin/catalogos";
import type { ArtesanoAdmin } from "@/lib/admin/types";
import type { InvitarState } from "@/app/admin/(panel)/artesanos/invitar-actions";

type Action = (prev: InvitarState, formData: FormData) => Promise<InvitarState>;

// Alta MÍNIMA: el admin captura nombre, taller/comercio, estado y contacto — y el artesano
// nace INACTIVO. Al crear, la acción devuelve el enlace de invitación → se muestra en un
// modal para copiarlo y mandarlo a mano. El oficio/semblanza/foto los sube el artesano en
// su panel (y el admin los puede editar aquí, en edición, como curado). Fiscales → Stripe.
export function ArtesanoForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: ArtesanoAdmin;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<InvitarState, FormData>(
    action,
    {},
  );
  const [modalCerrado, setModalCerrado] = useState(false);
  const e = (f: string) => state.errors?.[f]?.[0];

  return (
    <>
      <form action={formAction} className="space-y-6">
        {initial ? (
          <>
            <input type="hidden" name="id" value={initial.id} />
            <input type="hidden" name="updated_at" value={initial.updated_at} />
            <input type="hidden" name="foto_url" value={initial.foto_url ?? ""} />
          </>
        ) : null}

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

        {/* Datos de ALTA (los captura el admin). */}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Nombre del artesano" name="nombre" required defaultValue={initial?.nombre} error={e("nombre")} hint="Su dirección web se crea sola con el nombre." />
          <TextField label="Taller o comercio" name="taller" defaultValue={initial?.taller ?? undefined} error={e("taller")} hint="La marca con la que se le conoce (opcional)." />
          <SelectField label="Estado" name="region" defaultValue={initial?.region ?? ""} options={opcionesDe(ESTADOS_MX)} placeholder="Selecciona un estado…" error={e("region")} />
          <TextField label="Teléfono o correo de contacto" name="contacto" defaultValue={initial?.contacto ?? undefined} error={e("contacto")} hint="Referencia para ti; el enlace se manda aparte (no se envía a este dato)." />
          {initial ? (
            <TextField label="Dirección web" name="slug_display" defaultValue={initial.slug} readOnly hint="Se generó del nombre; no cambia." />
          ) : null}
        </div>

        {initial ? (
          /* Perfil público — lo sube el artesano; el admin también lo puede editar (curado). */
          <>
            <SelectField label="Oficio" name="oficio" defaultValue={initial.oficio ?? ""} options={opcionesDe(OFICIOS)} placeholder="Selecciona un oficio…" error={e("oficio")} />
            <TextareaField label="Semblanza" name="semblanza" defaultValue={initial.semblanza ?? undefined} error={e("semblanza")} />
            <ImageUpload name="foto" label="Foto del artesano" initial={initial.foto_url} hint="JPG, PNG o WebP, máximo 5 MB." />
            <p className="text-xs text-muted-foreground">
              El oficio, la semblanza y la foto también los puede editar el artesano desde su panel.
            </p>
          </>
        ) : (
          <>
            <input type="hidden" name="status" value="pausado" />
            <p className="rounded-ob-sm border border-tinto/15 bg-tinto/[0.03] px-3 py-2 text-xs text-muted-foreground">
              Se crea <strong>inactivo</strong>. Al guardar te daremos su enlace de invitación
              para que se lo mandes; el oficio, la semblanza y la foto los sube él al entrar, y
              los datos fiscales se dan de alta en Stripe.
            </p>
          </>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : submitLabel}
          </Button>
        </div>
      </form>

      {/* Al crear, la acción devuelve el enlace → modal para copiarlo y mandarlo. */}
      {state.link && !modalCerrado ? (
        <EnlaceInvitacionModal link={state.link} onClose={() => setModalCerrado(true)} />
      ) : null}
    </>
  );
}
