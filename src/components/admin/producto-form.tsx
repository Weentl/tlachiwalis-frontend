"use client";
import { useActionState } from "react";
import {
  TextField,
  TextareaField,
  SelectField,
} from "@/components/admin/fields";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import {
  ESTADOS_MX,
  OFICIOS,
  STATUS_PRODUCTO,
  opcionesDe,
} from "@/lib/admin/catalogos";
import type {
  ActionState,
  ArtesanoOpcion,
  ProductoAdmin,
} from "@/lib/admin/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ProductoForm({
  action,
  initial,
  artesanos,
  modo,
  submitLabel,
}: {
  action: Action;
  initial?: ProductoAdmin;
  artesanos: ArtesanoOpcion[];
  modo: "crear" | "editar";
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const e = (f: string) => state.errors?.[f]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {initial ? (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="updated_at" value={initial.updated_at} />
        </>
      ) : null}

      {state.message ? (
        <p className="rounded-ob-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Nombre de la pieza" name="nombre" required defaultValue={initial?.nombre} error={e("nombre")} hint="La dirección web de la pieza se crea sola con el nombre." />
        {modo === "editar" ? (
          <TextField label="Dirección web" name="id_display" defaultValue={initial?.id} readOnly hint="Se generó del nombre; no cambia." />
        ) : null}
        <SelectField label="Artesano" name="artesano_id" defaultValue={initial?.artesano_id ?? ""} options={artesanos.map((a) => ({ value: a.id, label: a.nombre }))} placeholder="— Sin asignar —" error={e("artesano_id")} />
        <TextField label="Taller (maker)" name="maker" defaultValue={initial?.maker} error={e("maker")} hint="Nombre mostrado en la pieza" />
        <SelectField label="Oficio" name="oficio" required defaultValue={initial?.oficio ?? ""} options={opcionesDe(OFICIOS)} placeholder="Selecciona un oficio…" error={e("oficio")} />
        <SelectField label="Estado" name="region" required defaultValue={initial?.region ?? ""} options={opcionesDe(ESTADOS_MX)} placeholder="Selecciona un estado…" error={e("region")} />
        <TextField label="Precio (MXN)" name="precio_pesos" type="number" inputMode="numeric" required defaultValue={initial ? String(Math.round(initial.precio_centavos / 100)) : ""} error={e("precio_pesos")} hint="En pesos enteros" />
        <SelectField label="Estatus" name="status" required defaultValue={initial?.status ?? "borrador"} options={STATUS_PRODUCTO} error={e("status")} />
      </div>

      <TextareaField label="Descripción" name="descripcion" defaultValue={initial?.descripcion} error={e("descripcion")} />

      <div className="grid gap-5 sm:grid-cols-3">
        <TextField label="Técnica" name="tecnica" defaultValue={initial?.tecnica} error={e("tecnica")} />
        <TextField label="Materiales" name="materiales" defaultValue={initial?.materiales} error={e("materiales")} />
        <TextField label="Medidas" name="medidas" defaultValue={initial?.medidas} error={e("medidas")} />
      </div>

      <ImageUpload
        name="imagen"
        label="Imagen"
        initial={initial?.imagen}
        hint={modo === "editar" ? "Deja vacío para conservar la actual. JPG/PNG/WebP, máx 5 MB." : "JPG, PNG o WebP, máximo 5 MB."}
      />

      <div className="pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
