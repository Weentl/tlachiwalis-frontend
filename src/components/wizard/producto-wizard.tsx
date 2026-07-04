"use client";
import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PasoCategoria } from "./paso-categoria";
import { CamposDinamicos } from "./campos-dinamicos";
import { MatrizVariantes } from "./matriz-variantes";
import { GaleriaUpload } from "./galeria-upload";
import { ESTADOS_MX, OFICIOS, opcionesDe } from "@/lib/admin/catalogos";
import type {
  ActionState,
  AtributoDeCategoria,
  Categoria,
} from "@/lib/admin/types";

// ════════════════════════════════════════════════════════════════════════════
// WIZARD DE CREACIÓN DE PIEZA (Fase 3) — móvil-primero, guiado por categoría.
// ════════════════════════════════════════════════════════════════════════════
// UN solo <form> con useActionState; el paso visible se controla en cliente. El
// submit FINAL manda todo (base + categoria_id + atributos + tipo_producto +
// variantes/stock + imágenes + intent). La `action` se INYECTA: admin o vendedor.
//   - Admin: recibe `artesanos` (elige dueño). Vendedor: `artesano` implícito.
// La autoridad de precio, slug, sku y las reglas de publicar viven en el servidor
// (lib/producto-wizard.ts). Aquí solo se recoge la FORMA y se da copy humano.
//
// Los atributos por categoría vienen PRE-RESUELTOS del server (defsPorCategoria):
// evita round-trips al elegir categoría en el Paso 1.

export type WizardAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type Rol = "admin" | "vendedor";

const PASOS = [
  { n: 1, titulo: "¿Qué vas a vender?" },
  { n: 2, titulo: "Cuéntanos de tu pieza" },
  { n: 3, titulo: "Precio y opciones" },
  { n: 4, titulo: "Fotos, envío y revisar" },
] as const;

export function ProductoWizard({
  action,
  rol,
  categorias,
  defsPorCategoria,
  artesanos,
  defaults,
}: {
  action: WizardAction;
  rol: Rol;
  categorias: Categoria[];
  defsPorCategoria: Record<number, AtributoDeCategoria[]>;
  // Solo admin: lista de artesanos para asignar. Vendedor: undefined (implícito).
  artesanos?: { id: string; nombre: string }[];
  // Autollenados inteligentes (región/oficio del perfil).
  defaults?: { region?: string; oficio?: string; artesanoId?: string };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  const [paso, setPaso] = React.useState(1);
  const [categoriaId, setCategoriaId] = React.useState<number | null>(null);
  const [nombre, setNombre] = React.useState("");
  const [precio, setPrecio] = React.useState("");
  // Paso 3: ¿variantes?  null = sin decidir; false = pieza única / stock simple.
  const [conVariantes, setConVariantes] = React.useState<boolean | null>(null);
  const [cantidad, setCantidad] = React.useState("1");
  const [numFotos, setNumFotos] = React.useState(0);
  // intent elegido al enviar (para deshabilitar ambos botones mientras trabaja).
  const [intent, setIntent] = React.useState<"borrador" | "publicar" | null>(null);

  const defs = categoriaId ? defsPorCategoria[categoriaId] ?? [] : [];
  const descriptivos = defs.filter((d) => !d.es_variacion);
  const ejes = defs.filter((d) => d.es_variacion);
  const categoriaTieneEjes = ejes.length > 0;

  // tipo_producto derivado de las elecciones del Paso 3 (autoridad final: server).
  const tipoProducto: "unico" | "stock_simple" | "con_variantes" =
    categoriaTieneEjes && conVariantes
      ? "con_variantes"
      : Number(cantidad) > 1
        ? "stock_simple"
        : "unico";

  // ── Éxito: crearWizard devuelve { ok:true, message:<id> } → navegar. ──
  React.useEffect(() => {
    if (state.ok && state.message) {
      const base = rol === "admin" ? "/admin/productos" : "/vendedor/productos";
      router.push(base);
      router.refresh();
    }
  }, [state, rol, router]);

  const e = (f: string) => state.errors?.[f]?.[0];

  // Validación por paso (copy humano). Solo el Paso 1 bloquea el avance.
  const puedeAvanzar1 = categoriaId !== null && nombre.trim().length > 0;

  const irA = (n: number) => setPaso(Math.min(4, Math.max(1, n)));

  return (
    <form action={formAction} className="space-y-6">
      {/* ── Progreso ── */}
      <ol className="flex items-center gap-1.5">
        {PASOS.map((p) => (
          <li key={p.n} className="flex flex-1 items-center gap-1.5">
            <button
              type="button"
              onClick={() => (p.n < paso ? irA(p.n) : undefined)}
              disabled={p.n > paso}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                p.n === paso
                  ? "bg-tinto text-[#f7f1e6]"
                  : p.n < paso
                    ? "bg-tinto/15 text-tinto hover:bg-tinto/25"
                    : "bg-tinto/5 text-muted-foreground",
              )}
              aria-current={p.n === paso ? "step" : undefined}
            >
              {p.n < paso ? <Check className="h-3.5 w-3.5" /> : p.n}
            </button>
            {p.n < PASOS.length ? (
              <span
                className={cn(
                  "h-px flex-1",
                  p.n < paso ? "bg-tinto/30" : "bg-tinto/10",
                )}
              />
            ) : null}
          </li>
        ))}
      </ol>

      <div>
        <h2 className="font-grotesk text-xl font-bold tracking-tight text-foreground">
          {PASOS[paso - 1].titulo}
        </h2>
      </div>

      {/* Error general del servidor (gate de publicar / conflicto / etc.) */}
      {state.message && !state.ok ? (
        <p className="rounded-ob-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      {/* ═══════════════════ Campos SIEMPRE presentes (hidden fuera del paso) ═══════════════════ */}
      {/* Se renderizan siempre para que el submit final los incluya, aunque el paso
          no esté visible. Los que el usuario edita en pantalla usan estado controlado. */}
      <input type="hidden" name="categoria_id" value={categoriaId ?? ""} />
      <input type="hidden" name="tipo_producto" value={tipoProducto} />
      {/* región/oficio: autollenados; requeridos por productoBaseSchema. En admin son
          visibles en el Paso 2; aquí garantizamos que siempre viajen. */}

      {/* ─────────────── PASO 1 ─────────────── */}
      <div className={paso === 1 ? "space-y-6" : "hidden"}>
        <PasoCategoria
          categorias={categorias}
          seleccionada={categoriaId}
          onSelect={(id) => {
            setCategoriaId(id);
            // reset de decisiones dependientes de la categoría
            setConVariantes(null);
          }}
        />
        {e("categoria_id") ? (
          <p className="text-xs text-destructive">{e("categoria_id")}</p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="nombre">Nombre de tu pieza</Label>
            <Input
              id="nombre"
              name="nombre"
              value={nombre}
              onChange={(ev) => setNombre(ev.target.value)}
              placeholder="Ej. Jarrón de barro negro"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              La dirección de tu página se crea sola con el nombre.
            </p>
            {e("nombre") ? (
              <p className="mt-1 text-xs text-destructive">{e("nombre")}</p>
            ) : null}
          </div>

          {rol === "admin" && artesanos ? (
            <div>
              <Label htmlFor="artesano_id">Artesano</Label>
              <select
                id="artesano_id"
                name="artesano_id"
                defaultValue={defaults?.artesanoId ?? ""}
                className="mt-1.5 w-full rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 focus:bg-card [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value="">— Sin asignar —</option>
                {artesanos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              {e("artesano_id") ? (
                <p className="mt-1 text-xs text-destructive">{e("artesano_id")}</p>
              ) : null}
            </div>
          ) : (
            // Vendedor: artesano implícito (el server lo impone). Nada que elegir.
            <input type="hidden" name="artesano_id" value="" />
          )}
        </div>
      </div>

      {/* ─────────────── PASO 2 ─────────────── */}
      <div className={paso === 2 ? "space-y-6" : "hidden"}>
        {/* Común: región + oficio (autollenados del perfil), descripción */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="region">¿De qué estado es?</Label>
            <select
              id="region"
              name="region"
              defaultValue={defaults?.region ?? ""}
              className="mt-1.5 w-full rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 focus:bg-card [&>option]:bg-card [&>option]:text-foreground"
            >
              <option value="">Selecciona un estado…</option>
              {opcionesDe(ESTADOS_MX).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {e("region") ? (
              <p className="mt-1 text-xs text-destructive">{e("region")}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="oficio">¿Qué oficio es?</Label>
            <select
              id="oficio"
              name="oficio"
              defaultValue={defaults?.oficio ?? ""}
              className="mt-1.5 w-full rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 focus:bg-card [&>option]:bg-card [&>option]:text-foreground"
            >
              <option value="">Selecciona un oficio…</option>
              {opcionesDe(OFICIOS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {e("oficio") ? (
              <p className="mt-1 text-xs text-destructive">{e("oficio")}</p>
            ) : null}
          </div>
        </div>

        <div>
          <Label htmlFor="descripcion">Cuenta la historia de tu pieza</Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            rows={4}
            className="mt-1.5"
            placeholder="Materiales, técnica, qué la hace especial…"
          />
        </div>

        {/* Atributos dinámicos de la categoría (descriptivos). Se re-monta al
            cambiar de categoría con key para reflejar las defs correctas. */}
        <div className="rounded-ob-sm border border-tinto/12 bg-tinto/[0.02] p-4">
          <CamposDinamicos
            key={categoriaId ?? "sin-cat"}
            descriptivos={descriptivos}
            errors={Object.fromEntries(
              descriptivos.map((d) => [d.codigo, e(d.codigo)]),
            )}
          />
        </div>
      </div>

      {/* ─────────────── PASO 3 ─────────────── */}
      <div className={paso === 3 ? "space-y-6" : "hidden"}>
        <div>
          <Label htmlFor="precio_pesos">Precio</Label>
          <div className="relative mt-1.5 max-w-[220px]">
            <Input
              id="precio_pesos"
              name="precio_pesos"
              type="number"
              inputMode="numeric"
              min={1}
              value={precio}
              onChange={(ev) => setPrecio(ev.target.value)}
              placeholder="0"
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              MXN
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">En pesos enteros.</p>
          {e("precio_pesos") ? (
            <p className="mt-1 text-xs text-destructive">{e("precio_pesos")}</p>
          ) : null}
        </div>

        {/* ¿Tiene opciones? Solo se ofrece si la categoría tiene ejes es_variacion. */}
        {categoriaTieneEjes ? (
          <div>
            <Label className="mb-1.5 block">
              ¿Tu pieza viene en varias opciones (talla, color…)?
            </Label>
            <div className="flex gap-2">
              {[
                { v: false, label: "No, es una sola" },
                { v: true, label: "Sí, tengo opciones" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  aria-pressed={conVariantes === o.v}
                  onClick={() => setConVariantes(o.v)}
                  className={cn(
                    "rounded-ob-sm border px-4 py-2.5 text-sm transition-colors",
                    conVariantes === o.v
                      ? "border-tinto bg-tinto/10 text-tinto"
                      : "border-tinto/20 text-foreground hover:border-tinto/50 hover:bg-tinto/5",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-ob-sm border border-tinto/12 bg-tinto/[0.02] px-4 py-3 text-sm text-muted-foreground">
            Esta categoría se maneja como pieza única.
          </p>
        )}

        {/* Rama SÍ → matriz de variantes */}
        {categoriaTieneEjes && conVariantes ? (
          <div className="rounded-ob-sm border border-tinto/12 bg-tinto/[0.02] p-4">
            <MatrizVariantes ejes={ejes} error={e("variantes")} />
          </div>
        ) : (
          // Rama NO → ¿cuántas tienes? (1 = única; >1 = stock simple)
          <div>
            <input type="hidden" name="variantes" value="[]" />
            <Label htmlFor="stock">¿Cuántas tienes disponibles?</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              inputMode="numeric"
              min={1}
              value={cantidad}
              onChange={(ev) => setCantidad(ev.target.value)}
              className="mt-1.5 max-w-[160px]"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Si es una pieza única, deja 1.
            </p>
            {e("stock") ? (
              <p className="mt-1 text-xs text-destructive">{e("stock")}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* ─────────────── PASO 4 ─────────────── */}
      <div className={paso === 4 ? "space-y-6" : "hidden"}>
        <div>
          <Label className="mb-1.5 block">Fotos de tu pieza</Label>
          <GaleriaUpload onCountChange={setNumFotos} />
        </div>

        <EnvioFisico />

        <Revisar
          categoria={
            categorias.find((c) => c.id === categoriaId)?.nombre ?? "—"
          }
          nombre={nombre}
          precio={precio}
          tipoProducto={tipoProducto}
          cantidad={cantidad}
          numFotos={numFotos}
        />
      </div>

      {/* ─────────────── Navegación / envío ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tinto/10 pt-5">
        {paso > 1 ? (
          <Button type="button" variant="ghost" onClick={() => irA(paso - 1)}>
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Button>
        ) : (
          <span />
        )}

        {paso < 4 ? (
          <Button
            type="button"
            onClick={() => irA(paso + 1)}
            disabled={paso === 1 && !puedeAvanzar1}
          >
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              name="intent"
              value="borrador"
              variant="outline"
              disabled={pending}
              onClick={() => setIntent("borrador")}
            >
              {pending && intent === "borrador" ? "Guardando…" : "Guardar borrador"}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="publicar"
              disabled={pending}
              onClick={() => setIntent("publicar")}
            >
              {pending && intent === "publicar" ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

// ── Envío físico (opcional): dimensiones de empaque. ──────────────────────────
function EnvioFisico() {
  const [abierto, setAbierto] = React.useState(false);
  return (
    <div className="rounded-ob-sm border border-tinto/12 bg-tinto/[0.02] p-4">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-foreground">
          Datos de envío (opcional)
        </span>
        <span className="text-xs text-muted-foreground">
          {abierto ? "Ocultar" : "Agregar"}
        </span>
      </button>
      {abierto ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <Label htmlFor="peso_gramos">Peso</Label>
            <Input id="peso_gramos" name="peso_gramos" type="number" inputMode="numeric" min={0} placeholder="0" className="mt-1.5 pr-10" />
            <span className="pointer-events-none absolute right-3 top-[38px] text-sm text-muted-foreground">g</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "largo_mm", label: "Largo" },
              { name: "ancho_mm", label: "Ancho" },
              { name: "alto_mm", label: "Alto" },
            ].map((d) => (
              <div key={d.name}>
                <Label htmlFor={d.name}>{d.label}</Label>
                <Input id={d.name} name={d.name} type="number" inputMode="numeric" min={0} placeholder="mm" className="mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Revisión con lenguaje humano + checklist suave. ───────────────────────────
function Revisar({
  categoria,
  nombre,
  precio,
  tipoProducto,
  cantidad,
  numFotos,
}: {
  categoria: string;
  nombre: string;
  precio: string;
  tipoProducto: "unico" | "stock_simple" | "con_variantes";
  cantidad: string;
  numFotos: number;
}) {
  const items: Array<{ ok: boolean; label: string }> = [
    { ok: nombre.trim().length > 0, label: "Le pusiste nombre" },
    { ok: categoria !== "—", label: "Elegiste el tipo de pieza" },
    { ok: Number(precio) > 0, label: "Tiene precio" },
    { ok: numFotos >= 1, label: "Subiste al menos una foto" },
  ];
  const tipoTexto =
    tipoProducto === "con_variantes"
      ? "Con opciones"
      : tipoProducto === "stock_simple"
        ? `${cantidad} disponibles`
        : "Pieza única";

  return (
    <div className="rounded-ob-sm border border-tinto/15 bg-card p-5">
      <h3 className="font-grotesk text-base font-semibold text-foreground">
        Antes de terminar
      </h3>
      <dl className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        <Dato k="Pieza" v={nombre || "—"} />
        <Dato k="Tipo" v={categoria} />
        <Dato k="Precio" v={precio ? `$${Number(precio).toLocaleString("es-MX")} MXN` : "—"} />
        <Dato k="Disponibilidad" v={tipoTexto} />
      </dl>
      <ul className="mt-4 space-y-1.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "grid h-4 w-4 place-items-center rounded-full text-[10px]",
                it.ok ? "bg-tinto text-[#f7f1e6]" : "bg-tinto/10 text-muted-foreground",
              )}
            >
              {it.ok ? <Check className="h-3 w-3" /> : "·"}
            </span>
            <span className={it.ok ? "text-foreground" : "text-muted-foreground"}>
              {it.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Publicar necesita foto, precio y disponibilidad. Puedes guardar como
        borrador cuando quieras y terminar después.
      </p>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-tinto/8 py-1 sm:border-none">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}
