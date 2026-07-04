import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { listarArtesanos } from "@/lib/admin/artesanos";
import { listarInvitacionesRegistro } from "@/lib/admin/invitaciones";
import { revocarInvitacion } from "./invitar-actions";
import { aprobarArtesano, eliminarArtesano } from "./actions";
import { DeleteButton } from "@/components/admin/delete-button";
import { FilterBar } from "@/components/admin/filter-bar";
import { InvitarRapido } from "@/components/admin/invitar-rapido";
import { InvitarRegistroButton } from "@/components/admin/invitar-registro-button";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { OFICIOS, ESTADOS_MX, STATUS_ARTESANO, opcionesDe } from "@/lib/admin/catalogos";

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] ?? "" : v ?? "").toString();

export default async function ArtesanosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const [todos, invitaciones] = await Promise.all([
    listarArtesanos(),
    listarInvitacionesRegistro(),
  ]);

  const f = {
    q: one(sp.q).toLowerCase(),
    oficio: one(sp.oficio),
    region: one(sp.region),
    status: one(sp.status),
  };
  const pendientes = todos.filter((a) => a.status === "pendiente");
  let items = todos.filter((a) => a.status !== "pendiente");
  if (f.oficio) items = items.filter((a) => a.oficio === f.oficio);
  if (f.region) items = items.filter((a) => a.region === f.region);
  if (f.status) items = items.filter((a) => a.status === f.status);
  if (f.q)
    items = items.filter(
      (a) =>
        a.nombre.toLowerCase().includes(f.q) ||
        a.slug.toLowerCase().includes(f.q),
    );
  const filtrando = Object.values(f).some(Boolean);

  return (
    <div>
      <AutoRefresh />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-grotesk text-3xl font-bold tracking-tight text-foreground">
            Artesanos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtrando
              ? `${items.length} de ${todos.length} registros`
              : `${todos.length} ${todos.length === 1 ? "registro" : "registros"}`}
          </p>
        </div>
        <InvitarRegistroButton />
      </header>

      {invitaciones.length > 0 ? (
        <div className="card-warm mb-6 p-5">
          <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
            Invitaciones de registro pendientes ({invitaciones.length})
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Links generados que aún no se usan. El enlace solo se muestra al crearlo; si se
            perdió, genera otro y revoca este.
          </p>
          <ul className="mt-3 divide-y divide-tinto/10 text-sm">
            {invitaciones.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-4 py-2">
                <span className="text-muted-foreground">
                  Creada {new Date(inv.created_at).toLocaleDateString("es-MX")} · caduca{" "}
                  {new Date(inv.expira_en).toLocaleDateString("es-MX")}
                </span>
                <form action={revocarInvitacion}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                    Revocar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendientes.length > 0 ? (
        <div className="card-warm mb-6 border-l-2 border-tinto p-5">
          <h2 className="font-grotesk text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
            Solicitudes por aprobar ({pendientes.length})
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Artesanos que completaron su registro. Revisa su perfil y aprueba para darles
            acceso a la plataforma.
          </p>
          <ul className="mt-3 divide-y divide-tinto/10">
            {pendientes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{a.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {[a.oficio, a.region].filter(Boolean).join(" · ") || "—"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/artesanos/${a.id}`}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Ver detalle
                  </Link>
                  <DeleteButton
                    action={eliminarArtesano}
                    id={a.id}
                    label="Rechazar"
                    confirmText={`¿Rechazar y borrar la solicitud de ${a.nombre}? Se elimina su cuenta de acceso.`}
                  />
                  <form action={aprobarArtesano}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-ob-sm bg-tinto px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#f7f1e6] transition-colors hover:bg-[#6b2a23]"
                    >
                      Aprobar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FilterBar
        searchPlaceholder="Buscar por nombre o slug…"
        selects={[
          { name: "status", label: "Estatus", options: STATUS_ARTESANO },
          { name: "oficio", label: "Oficio", options: opcionesDe(OFICIOS) },
          { name: "region", label: "Estado", options: opcionesDe(ESTADOS_MX) },
        ]}
      />

      {items.length === 0 ? (
        <p className="card-warm px-5 py-14 text-center text-sm text-muted-foreground">
          {filtrando
            ? "No hay artesanos que coincidan con los filtros."
            : "Aún no hay artesanos. Invita al primero con “Invitar artesano”; el artesano crea su cuenta y llena sus datos desde el enlace."}
        </p>
      ) : (
        <div className="card-warm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tinto/12 text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Oficio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Taller</th>
                  <th className="px-4 py-3 font-medium">Estatus</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-tinto/10 transition-colors hover:bg-tinto/[0.02]"
                  >
                    <td className="px-4 py-2">
                      <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-tinto/15 bg-background">
                        {a.foto_url ? (
                          <Image src={a.foto_url} alt={a.nombre} fill sizes="40px" className="object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{a.nombre}</p>
                      <p className="font-mono text-xs text-muted-foreground">{a.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.oficio ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.region ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.taller ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background:
                                a.status === "activo"
                                  ? "#57211d"
                                  : a.user_id
                                    ? "#b3261e"
                                    : "#8c7c68",
                            }}
                          />
                          {a.status === "activo"
                            ? "Activo"
                            : a.user_id
                              ? "Suspendido"
                              : "Pendiente"}
                        </span>
                        {a.user_id ? (
                          <span className="text-[11px] text-muted-foreground">cuenta vinculada</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">sin cuenta aún</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        {!a.user_id ? (
                          <InvitarRapido artesanoId={a.id} />
                        ) : null}
                        <Link
                          href={`/admin/artesanos/${a.id}`}
                          className="text-xs font-medium text-tinto hover:underline"
                        >
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
