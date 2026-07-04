"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MedidorPassword } from "@/components/registro/medidor-password";
import { evaluarPassword } from "@/lib/password-strength";
import { enviarRegistro } from "@/app/unirse/actions";
import { ESTADOS_MX, OFICIOS } from "@/lib/admin/catalogos";

// Registro AUTOGUIADO del artesano (llena TODO). Estado local que acumula entre pasos;
// el envío final (crear cuenta + artesano 'pendiente' + fotos + Stripe) se cablea en el
// siguiente entregable (Paso 3 backend). Aquí queda la UX guiada + validación por paso.
type Datos = {
  nombres: string;
  apellidoP: string;
  apellidoM: string;
  fechaNac: string;
  telefono: string;
  email: string;
  password: string;
  password2: string;
  tipoVendedor: "persona" | "taller" | "tienda";
  nombreNegocio: string;
  numPersonas: string;
  ciudad: string;
  estadoDir: string;
  semblanza: string;
  oficio: string;
  region: string;
  instagram: string;
  sitio: string;
  aniosExp: string;
  enviaNacional: boolean;
  fotoPerfil: File | null;
  fotoPortada: File | null;
};

const VACIO: Datos = {
  nombres: "", apellidoP: "", apellidoM: "", fechaNac: "", telefono: "",
  email: "", password: "", password2: "", tipoVendedor: "persona",
  nombreNegocio: "", numPersonas: "", ciudad: "", estadoDir: "", semblanza: "",
  oficio: "", region: "", instagram: "", sitio: "", aniosExp: "", enviaNacional: false,
  fotoPerfil: null, fotoPortada: null,
};

const inputCls =
  "mt-1 w-full rounded-ob-sm border border-tinto/25 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto";

function Campo({
  label, value, onChange, type = "text", hint, opcional, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; hint?: string; opcional?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">
        {label}
        {opcional ? <span className="font-normal text-muted-foreground"> (opcional)</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Selector({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function SelectorImagen({
  label, file, onChange, hint,
}: {
  label: string; file: File | null; onChange: (f: File | null) => void; hint?: string;
}) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-ob-sm border border-tinto/20 bg-tinto/5">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">Foto</span>
          )}
        </div>
        <label className="cursor-pointer text-sm font-medium text-tinto hover:underline">
          {file ? "Cambiar imagen" : "Subir imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function RegistroWizard({ token }: { token: string }) {
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<Datos>(VACIO);
  const set = <K extends keyof Datos>(k: K, v: Datos[K]) => setD((p) => ({ ...p, [k]: v }));
  const esNegocio = d.tipoVendedor !== "persona";
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      sessionStorage.removeItem("tlachiwalis-registro"); // descarta el borrador
    } catch {
      /* ignore */
    }
    const res = await enviarRegistro(
      {
        token,
        nombres: d.nombres, apellidoP: d.apellidoP, apellidoM: d.apellidoM,
        fechaNac: d.fechaNac, telefono: d.telefono, email: d.email, password: d.password,
        tipoVendedor: d.tipoVendedor, nombreNegocio: d.nombreNegocio, numPersonas: d.numPersonas,
        ciudad: d.ciudad, semblanza: d.semblanza, oficio: d.oficio, region: d.region,
        instagram: d.instagram, sitio: d.sitio, aniosExp: d.aniosExp, enviaNacional: d.enviaNacional,
      },
      d.fotoPerfil,
      d.fotoPortada,
    );
    // Éxito → enviarRegistro redirige a la sala de espera. Si vuelve, es error.
    if (res?.error) {
      setErrorEnvio(res.error);
      setEnviando(false);
    }
  }

  // Persistencia: no perder el avance al refrescar (sessionStorage). NO guardamos la
  // contraseña ni las fotos (File no serializa) por seguridad; se recapturan si refrescas.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tlachiwalis-registro");
      if (!raw) return;
      const { paso: pasoGuardado, ...datosGuardados } = JSON.parse(raw) as Partial<Datos> & {
        paso?: number;
      };
      setD((p) => ({
        ...p,
        ...datosGuardados,
        password: "",
        password2: "",
        fotoPerfil: null,
        fotoPortada: null,
      }));
      if (typeof pasoGuardado === "number") setPaso(Math.max(0, Math.min(pasoGuardado, 7)));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "tlachiwalis-registro",
        JSON.stringify({
          nombres: d.nombres, apellidoP: d.apellidoP, apellidoM: d.apellidoM,
          fechaNac: d.fechaNac, telefono: d.telefono, email: d.email,
          tipoVendedor: d.tipoVendedor, nombreNegocio: d.nombreNegocio,
          numPersonas: d.numPersonas, ciudad: d.ciudad, estadoDir: d.estadoDir,
          semblanza: d.semblanza, oficio: d.oficio, region: d.region,
          instagram: d.instagram, sitio: d.sitio, aniosExp: d.aniosExp,
          enviaNacional: d.enviaNacional, paso,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [d, paso]);

  // Definición de pasos: título + contenido + validez para avanzar.
  const pasos: { titulo: string; contenido: ReactNode; valido: boolean }[] = [
    {
      titulo: "Bienvenida",
      valido: true,
      contenido: (
        <div className="space-y-3 text-sm text-foreground/80">
          <p className="font-serif text-lg italic text-tinto">Te invitaron a vender en Tlachiwalis.</p>
          <p>Vamos a crear tu cuenta y armar tu página en el marketplace. Toma ~5 minutos.</p>
          <p>Necesitarás: tu nombre, un correo y contraseña, cómo vendes (tú, tu taller o tu tienda), tu historia y fotos. Al final conectas tus cobros con Stripe.</p>
          <p className="text-muted-foreground">Cuando termines, tu solicitud pasa a revisión del equipo antes de publicarse.</p>
        </div>
      ),
    },
    {
      titulo: "Tu nombre",
      valido: Boolean(d.nombres.trim() && d.apellidoP.trim() && d.fechaNac && d.telefono.length === 10),
      contenido: (
        <div className="space-y-4">
          <Campo label="Nombre(s)" value={d.nombres} onChange={(v) => set("nombres", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Apellido paterno" value={d.apellidoP} onChange={(v) => set("apellidoP", v)} />
            <Campo label="Apellido materno" value={d.apellidoM} onChange={(v) => set("apellidoM", v)} opcional />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Fecha de nacimiento" type="date" value={d.fechaNac} onChange={(v) => set("fechaNac", v)} hint="Stripe la pedirá para verificar tu identidad." />
            <Campo
              label="Teléfono / WhatsApp"
              value={d.telefono}
              onChange={(v) => set("telefono", v.replace(/\D/g, "").slice(0, 10))}
              placeholder="10 dígitos"
              hint={d.telefono.length > 0 && d.telefono.length < 10 ? "Deben ser 10 dígitos." : undefined}
            />
          </div>
        </div>
      ),
    },
    {
      titulo: "Tu cuenta",
      valido: emailOk(d.email) && evaluarPassword(d.password, d.email).ok && d.password === d.password2,
      contenido: (
        <div className="space-y-4">
          <Campo label="Correo" type="email" value={d.email} onChange={(v) => set("email", v)} placeholder="tú@correo.com" />
          <div>
            <Campo label="Contraseña" type="password" value={d.password} onChange={(v) => set("password", v)} />
            <MedidorPassword pwd={d.password} email={d.email} />
          </div>
          <Campo label="Repite la contraseña" type="password" value={d.password2} onChange={(v) => set("password2", v)} />
          {d.password2 && d.password !== d.password2 ? (
            <p className="text-xs text-destructive">Las contraseñas no coinciden.</p>
          ) : null}
        </div>
      ),
    },
    {
      titulo: "¿Cómo vendes?",
      valido: d.tipoVendedor === "persona" || Boolean(d.nombreNegocio.trim()),
      contenido: (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["persona", "Como artesano", "Vendes a tu nombre"],
              ["taller", "Taller", "Un taller con ayudantes"],
              ["tienda", "Tienda", "Un comercio/varios makers"],
            ] as const).map(([val, tit, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => set("tipoVendedor", val)}
                className={`rounded-ob border p-4 text-left transition-colors ${
                  d.tipoVendedor === val ? "border-tinto bg-tinto/5" : "border-tinto/20 hover:border-tinto/50"
                }`}
              >
                <p className="font-grotesk text-sm font-semibold text-foreground">{tit}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
          {esNegocio ? (
            <div className="space-y-4">
              <Campo label="Nombre del negocio" value={d.nombreNegocio} onChange={(v) => set("nombreNegocio", v)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="¿Cuántas personas trabajan?" type="number" value={d.numPersonas} onChange={(v) => set("numPersonas", v)} opcional placeholder="1" />
                <Campo label="Ciudad" value={d.ciudad} onChange={(v) => set("ciudad", v)} opcional />
              </div>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      titulo: "Tu página",
      valido: Boolean(d.oficio && d.region),
      contenido: (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Esto arma tu página pública en el marketplace.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Selector label="Tu oficio" value={d.oficio} onChange={(v) => set("oficio", v)} options={OFICIOS} placeholder="Elige tu oficio…" />
            <Selector label="Estado" value={d.region} onChange={(v) => set("region", v)} options={ESTADOS_MX} placeholder="Elige tu estado…" />
          </div>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Tu historia</span>
            <textarea value={d.semblanza} onChange={(e) => set("semblanza", e.target.value)} rows={4} className={inputCls} placeholder="Cuenta quién eres y cómo trabajas…" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Instagram" value={d.instagram} onChange={(v) => set("instagram", v)} opcional placeholder="@tumarca" />
            <Campo label="Sitio web" value={d.sitio} onChange={(v) => set("sitio", v)} opcional />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={d.enviaNacional} onChange={(e) => set("enviaNacional", e.target.checked)} />
            Envío a todo México
          </label>
          <p className="rounded-ob-sm border border-tinto/15 bg-tinto/[0.03] px-3 py-2 text-xs text-muted-foreground">
            📷 En los siguientes pasos subes tus fotos y conectas tus cobros con Stripe.
          </p>
        </div>
      ),
    },
    {
      titulo: "Fotos",
      valido: true,
      contenido: (
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Así se verá tu página. Las puedes cambiar después desde tu panel.
          </p>
          <SelectorImagen
            label="Foto de perfil o logo"
            file={d.fotoPerfil}
            onChange={(fl) => set("fotoPerfil", fl)}
            hint="Cuadrada se ve mejor."
          />
          <SelectorImagen
            label="Foto de portada (banner)"
            file={d.fotoPortada}
            onChange={(fl) => set("fotoPortada", fl)}
            hint="Horizontal, con tu taller o tus piezas."
          />
          <p className="rounded-ob-sm border border-tinto/15 bg-tinto/[0.03] px-3 py-2 text-xs text-muted-foreground">
            Se optimizan y suben al enviar tu solicitud; por tu privacidad quitamos los datos
            de ubicación (GPS) de la foto.
          </p>
        </div>
      ),
    },
    {
      titulo: "Cobros",
      valido: true,
      contenido: (
        <div className="space-y-3 text-sm text-foreground/80">
          <p className="font-serif text-lg italic text-tinto">Conecta tus cobros con Stripe.</p>
          <p>
            Cuando tu solicitud sea aprobada, conectarás tu cuenta con <strong>Stripe</strong>:
            ahí capturas tus datos bancarios y fiscales (RFC/CLABE) de forma segura.
          </p>
          <p className="text-muted-foreground">
            Nosotros no guardamos esos datos, los maneja Stripe. Recibes tus pagos ahí y la
            plataforma retiene los impuestos que marca la ley.
          </p>
          <div className="rounded-ob-sm border border-tinto/15 bg-tinto/[0.03] px-3 py-2 text-xs text-muted-foreground">
            El botón “Conectar con Stripe” aparecerá en tu panel tras la aprobación (en
            construcción).
          </div>
        </div>
      ),
    },
    {
      titulo: "Revisión",
      valido: true,
      contenido: (
        <div className="space-y-3 text-sm">
          <p className="text-foreground/80">Revisa tus datos antes de enviar tu solicitud.</p>
          <dl className="rounded-ob border border-tinto/15 p-4 text-sm">
            {[
              ["Nombre", `${d.nombres} ${d.apellidoP} ${d.apellidoM}`.trim()],
              ["Vendes como", d.tipoVendedor === "persona" ? "Artesano" : `${d.tipoVendedor} · ${d.nombreNegocio}`],
              ["Oficio", d.oficio],
              ["Estado", d.region],
              ["Correo", d.email],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-tinto/10 py-1.5 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-ob-sm border border-tinto/20 bg-tinto/5 px-3 py-2 text-xs text-foreground/80">
            Al enviar creamos tu cuenta y tu solicitud queda <strong>en revisión</strong> del
            equipo; entrarás a tu panel en cuanto la aprueben. (Las fotos y la conexión con
            Stripe las completas desde tu panel.)
          </p>
        </div>
      ),
    },
  ];

  const actual = pasos[paso] ?? pasos[0];
  const ultimo = paso === pasos.length - 1;

  return (
    <div>
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-1.5" aria-hidden>
        {pasos.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= paso ? "bg-tinto" : "bg-tinto/15"}`} />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        Paso {paso + 1} de {pasos.length}
      </p>
      <h2 className="mt-1 font-grotesk text-xl font-bold tracking-tight text-foreground">{actual.titulo}</h2>

      <div className="mt-5">{actual.contenido}</div>

      {errorEnvio ? (
        <p className="mt-6 rounded-ob-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorEnvio}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPaso((p) => Math.max(0, p - 1))}
          disabled={paso === 0 || enviando}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          ← Atrás
        </button>
        {ultimo ? (
          <Button type="button" disabled={enviando} onClick={enviar}>
            {enviando ? "Enviando…" : "Enviar solicitud"}
          </Button>
        ) : (
          <Button type="button" disabled={!actual.valido} onClick={() => setPaso((p) => p + 1)}>
            Siguiente →
          </Button>
        )}
      </div>
    </div>
  );
}
