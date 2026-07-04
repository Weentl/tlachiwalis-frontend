import Image from "next/image";
import { cn } from "@/lib/utils";

function iniciales(nombre?: string | null, apellido?: string | null) {
  const a = (nombre ?? "").trim().charAt(0);
  const b = (apellido ?? "").trim().charAt(0);
  return (a + b).toUpperCase() || "·";
}

// Avatar del comprador: foto si existe, iniciales si no. Máscara de arco (Portal = retrato en Manos).
export function AvatarIniciales({
  nombre,
  apellido,
  avatarUrl,
  size = "lg",
}: {
  nombre?: string | null;
  apellido?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-[72px] w-[72px]" : "h-11 w-11";
  const txt = size === "lg" ? "text-2xl" : "text-base";
  return (
    <div className={cn("portal relative shrink-0 overflow-hidden bg-arena ring-1 ring-linea", dim)}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill sizes="72px" className="object-cover" />
      ) : (
        <span className={cn("grid h-full w-full place-items-center font-display text-tinta", txt)}>
          {iniciales(nombre, apellido)}
        </span>
      )}
    </div>
  );
}
