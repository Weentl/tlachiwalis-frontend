"use client";
import * as React from "react";
import { useActionState } from "react";
import Image from "next/image";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CamposDinamicos } from "./campos-dinamicos";
import { MatrizVariantes } from "./matriz-variantes";
import { GaleriaUpload } from "./galeria-upload";
import { urlPublicaPieza } from "@/lib/storage-url";
import type {
  ActionState,
  AtributoDeCategoria,
  Categoria,
  ImagenProducto,
  ProductoAdmin,
  VarianteConInventario,
} from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// EDITAR (NO wizard): pestañas de acceso aleatorio. Cada una guarda con SU Server
// Action de update parcial + optimistic lock por updated_at. Reusa los mismos
// componentes que el wizard (CamposDinamicos, MatrizVariantes, GaleriaUpload).
// Las acciones se INYECTAN (admin/vendedor). El scope por dueño ya lo impone el
// server (anti-IDOR); aquí solo la UI.

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type EditarAcciones = {
  basico: Action;
  atributos: Action;
  variantes: Action;
  galeria: Action;
  envio: Action;
  publicar: (formData: FormData) => Promise<ActionState>;
  despublicar: (formData: FormData) => Promise<void>;
};

const TABS = [
  { id: "basico", label: "Básico" },
  { id: "detalles", label: "Detalles" },
  { id: "opciones", label: "Opciones" },
  { id: "fotos", label: "Fotos" },
  { id: "envio", label: "Envío" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function EditarTabs({
  producto,
  categorias,
  defsPorCategoria,
  variantes,
  galeria,
  acciones,
}: {
  // `rol` se acepta por simetría con el wizard y para documentar el contexto; el
  // scope real por dueño lo impone el servidor (acciones inyectadas), no la UI.
  rol: "admin" | "vendedor";
  producto: ProductoAdmin;
  categorias: Categoria[];
  defsPorCategoria: Record<number, AtributoDeCategoria[]>;
  variantes: VarianteConInventario[];
  galeria: ImagenProducto[];
  acciones: EditarAcciones;
}) {
  const [tab, setTab] = React.useState<TabId>("basico");
  const defs = producto.categoria_id
    ? defsPorCategoria[producto.categoria_id] ?? []
    : [];

  return (
    <div>
      <EstadoPublicacion producto={producto} acciones={acciones} />

      <div className="mt-6 flex flex-wrap gap-1.5 border-b border-tinto/12">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-ob-sm px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-tinto text-tinto"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card-warm mt-4 p-6">
        {tab === "basico" ? (
          <TabBasico producto={producto} categorias={categorias} action={acciones.basico} />
        ) : tab === "detalles" ? (
          <TabDetalles producto={producto} defs={defs} action={acciones.atributos} />
        ) : tab === "opciones" ? (
          <TabOpciones producto={producto} defs={defs} variantes={variantes} action={acciones.variantes} />
        ) : tab === "fotos" ? (
          <TabFotos producto={producto} galeria={galeria} action={acciones.galeria} />
        ) : (
          <TabEnvio producto={producto} action={acciones.envio} />
        )}
      </div>
    </div>
  );
}

// ── Cabecera: pastilla de estado + publicar/despublicar ───────────────────────
const PILL: Record<string, { label: string; cls: string }> = {
  publicado: { label: "A la venta", cls: "bg-[#2f6b3a]/12 text-[#2f6b3a]" },
  borrador: { label: "Borrador", cls: "bg-tinto/8 text-muted-foreground" },
  agotado: { label: "Agotado", cls: "bg-[#b8860b]/12 text-[#8a6500]" },
};

function EstadoPublicacion({
  producto,
  acciones,
}: {
  producto: ProductoAdmin;
  acciones: EditarAcciones;
}) {
  const [state, publicarAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, fd) => acciones.publicar(fd),
    {},
  );
  const pill = PILL[producto.status] ?? PILL.borrador;

  return (
    <div className="card-warm flex flex-wrap items-center justify-between gap-3 p-4">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-ob-sm px-2.5 py-1 text-xs font-semibold",
          pill.cls,
        )}
      >
        {pill.label}
      </span>

      {state.message ? (
        <p className="order-last w-full text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        {producto.status === "publicado" ? (
          <form action={acciones.despublicar}>
            <input type="hidden" name="id" value={producto.id} />
            <Button type="submit" variant="outline">
              Pasar a borrador
            </Button>
          </form>
        ) : (
          <form action={publicarAction}>
            <input type="hidden" name="id" value={producto.id} />
            <Button type="submit" disabled={pending}>
              {pending ? "Publicando…" : "Publicar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Envoltura estándar: useActionState + lock + feedback de guardado ──────────
function useGuardar(action: Action) {
  return useActionState<ActionState, FormData>(action, {});
}

function BarraGuardar({
  state,
  pending,
}: {
  state: ActionState;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
      {state.ok ? (
        <span className="text-sm text-[#2f6b3a]" aria-live="polite">
          Guardado.
        </span>
      ) : null}
      {state.message && !state.ok ? (
        <span className="text-sm text-destructive" role="alert">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

// ── Pestaña: Básico ───────────────────────────────────────────────────────────
function TabBasico({
  producto,
  categorias,
  action,
}: {
  producto: ProductoAdmin;
  categorias: Categoria[];
  action: Action;
}) {
  const [state, formAction, pending] = useGuardar(action);
  const e = (f: string) => state.errors?.[f]?.[0];
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={producto.id} />
      <input type="hidden" name="updated_at" value={producto.updated_at} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" defaultValue={producto.nombre} className="mt-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">
            Dirección de tu página: <span className="font-mono">{producto.id}</span> (no cambia).
          </p>
          {e("nombre") ? <p className="mt-1 text-xs text-destructive">{e("nombre")}</p> : null}
        </div>
        <div>
          <Label htmlFor="categoria_id">Tipo de pieza</Label>
          <select
            id="categoria_id"
            name="categoria_id"
            defaultValue={producto.categoria_id ?? ""}
            className="mt-1.5 w-full rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 focus:bg-card [&>option]:bg-card [&>option]:text-foreground"
          >
            <option value="">— Sin categoría —</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {e("categoria_id") ? <p className="mt-1 text-xs text-destructive">{e("categoria_id")}</p> : null}
        </div>
        <div>
          <Label htmlFor="precio_pesos">Precio (MXN)</Label>
          <Input
            id="precio_pesos"
            name="precio_pesos"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={String(Math.round(producto.precio_centavos / 100))}
            className="mt-1.5"
          />
          {e("precio_pesos") ? <p className="mt-1 text-xs text-destructive">{e("precio_pesos")}</p> : null}
        </div>
      </div>

      <div>
        <Label htmlFor="descripcion">Historia de la pieza</Label>
        <Textarea id="descripcion" name="descripcion" rows={4} defaultValue={producto.descripcion ?? ""} className="mt-1.5" />
      </div>

      <BarraGuardar state={state} pending={pending} />
    </form>
  );
}

// ── Pestaña: Detalles (atributos descriptivos) ────────────────────────────────
function TabDetalles({
  producto,
  defs,
  action,
}: {
  producto: ProductoAdmin;
  defs: AtributoDeCategoria[];
  action: Action;
}) {
  const [state, formAction, pending] = useGuardar(action);
  const descriptivos = defs.filter((d) => !d.es_variacion);
  const e = (f: string) => state.errors?.[f]?.[0];
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={producto.id} />
      <input type="hidden" name="updated_at" value={producto.updated_at} />
      {producto.categoria_id ? (
        <CamposDinamicos
          descriptivos={descriptivos}
          inicial={producto.atributos}
          errors={Object.fromEntries(descriptivos.map((d) => [d.codigo, e(d.codigo)]))}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Elige un tipo de pieza en la pestaña Básico para ver sus detalles.
        </p>
      )}
      <BarraGuardar state={state} pending={pending} />
    </form>
  );
}

// ── Pestaña: Opciones (variantes + inventario) ────────────────────────────────
function TabOpciones({
  producto,
  defs,
  variantes,
  action,
}: {
  producto: ProductoAdmin;
  defs: AtributoDeCategoria[];
  variantes: VarianteConInventario[];
  action: Action;
}) {
  const [state, formAction, pending] = useGuardar(action);
  const ejes = defs.filter((d) => d.es_variacion);
  // Filas iniciales desde las variantes existentes (opciones={} = pieza única no cuenta).
  const inicial = variantes
    .filter((v) => Object.keys(v.opciones).length > 0)
    .map((v) => ({
      opciones: v.opciones,
      stock: v.inventario?.stock ?? 0,
    }));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={producto.id} />
      {ejes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta categoría se maneja como pieza única (sin tallas ni colores). Ajusta
          la disponibilidad como stock simple desde el alta.
        </p>
      ) : (
        <MatrizVariantes ejes={ejes} inicial={inicial} error={state.errors?.variantes?.[0]} />
      )}
      <BarraGuardar state={state} pending={pending} />
    </form>
  );
}

// ── Pestaña: Fotos (galería: existentes + nuevas + portada + borrar) ──────────
function TabFotos({
  producto,
  galeria,
  action,
}: {
  producto: ProductoAdmin;
  galeria: ImagenProducto[];
  action: Action;
}) {
  const [state, formAction, pending] = useGuardar(action);
  // Estado local de las imágenes EXISTENTES: orden + portada + a-borrar.
  const [items, setItems] = React.useState(
    galeria.map((g) => ({
      id: g.id,
      path: g.storage_path,
      es_principal: g.es_principal,
    })),
  );
  const [borrar, setBorrar] = React.useState<string[]>([]);

  const vivos = items.filter((it) => !borrar.includes(it.id));

  const marcarPortada = (id: string) =>
    setItems((prev) => prev.map((it) => ({ ...it, es_principal: it.id === id })));

  const toggleBorrar = (id: string) =>
    setBorrar((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // meta: orden por posición + portada; solo de los que quedan vivos.
  const meta = vivos.map((it, i) => ({
    id: it.id,
    orden: i,
    es_principal: it.es_principal,
  }));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={producto.id} />
      <input type="hidden" name="borrar" value={JSON.stringify(borrar)} />
      <input type="hidden" name="meta" value={JSON.stringify(meta)} />

      {items.length > 0 ? (
        <div>
          <Label className="mb-2 block">Fotos actuales</Label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((it) => {
              const marcado = borrar.includes(it.id);
              return (
                <div
                  key={it.id}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-ob-sm border bg-background",
                    marcado ? "border-destructive/60 opacity-40" : "border-tinto/20",
                  )}
                >
                  <Image
                    src={urlPublicaPieza(it.path)}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                  {it.es_principal && !marcado ? (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-ob-sm bg-tinto/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#f7f1e6]">
                      <Star className="h-3 w-3 fill-current" /> Portada
                    </span>
                  ) : !marcado ? (
                    <button
                      type="button"
                      onClick={() => marcarPortada(it.id)}
                      title="Hacer portada"
                      className="absolute left-1.5 top-1.5 rounded-ob-sm bg-background/85 p-1 text-tinto opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleBorrar(it.id)}
                    title={marcado ? "No borrar" : "Borrar"}
                    className="absolute right-1.5 top-1.5 rounded-ob-sm bg-background/85 p-1 text-destructive opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div>
        <Label className="mb-2 block">Agregar fotos</Label>
        <GaleriaUpload />
      </div>

      <BarraGuardar state={state} pending={pending} />
    </form>
  );
}

// ── Pestaña: Envío ────────────────────────────────────────────────────────────
function TabEnvio({ producto, action }: { producto: ProductoAdmin; action: Action }) {
  const [state, formAction, pending] = useGuardar(action);
  const e = (f: string) => state.errors?.[f]?.[0];
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={producto.id} />
      <input type="hidden" name="updated_at" value={producto.updated_at} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <Label htmlFor="peso_gramos">Peso (g)</Label>
          <Input id="peso_gramos" name="peso_gramos" type="number" inputMode="numeric" min={0} defaultValue={producto.peso_gramos ?? ""} className="mt-1.5" />
          {e("peso_gramos") ? <p className="mt-1 text-xs text-destructive">{e("peso_gramos")}</p> : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "largo_mm", label: "Largo", v: producto.largo_mm },
            { name: "ancho_mm", label: "Ancho", v: producto.ancho_mm },
            { name: "alto_mm", label: "Alto", v: producto.alto_mm },
          ].map((d) => (
            <div key={d.name}>
              <Label htmlFor={d.name}>{d.label} (mm)</Label>
              <Input id={d.name} name={d.name} type="number" inputMode="numeric" min={0} defaultValue={d.v ?? ""} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>
      <BarraGuardar state={state} pending={pending} />
    </form>
  );
}
