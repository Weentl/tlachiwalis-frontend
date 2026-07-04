import Image from "next/image";
import { cn } from "@/lib/utils";

/* MediaFrame — firma "Manos". Reemplaza el doble filete de museo por una máscara
   de esquina suave con sombra cálida. Variante `portal` = arco (retratos/héroes).
   `muted` desatura (agotado — nunca rojo). El zoom reacciona al hover del `group`
   contenedor (la card). */

type Radius = "md" | "lg" | "xl";
const radiusCls: Record<Radius, string> = {
  md: "rounded-[14px]",
  lg: "rounded-[20px]",
  xl: "rounded-[28px]",
};

export type MediaFrameProps = {
  src: string;
  alt: string;
  aspect: string;
  sizes: string;
  muted?: boolean;
  variant?: "card" | "portal" | "plain";
  radius?: Radius;
  priority?: boolean;
  zoomOnHover?: boolean;
  className?: string;
};

export function MediaFrame({
  src,
  alt,
  aspect,
  sizes,
  muted,
  variant = "card",
  radius = "lg",
  priority,
  zoomOnHover = true,
  className,
}: MediaFrameProps) {
  const shape = variant === "portal" ? "portal" : radiusCls[radius];
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-arena",
        shape,
        variant === "card" && "shadow-pieza ring-1 ring-linea/70",
        className,
      )}
    >
      <div className={cn("relative", aspect)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-700 ease-out",
            zoomOnHover && "group-hover:scale-[1.04]",
            muted && "opacity-70 grayscale-[0.25]",
          )}
        />
      </div>
    </div>
  );
}

/* Back-compat: los llamadores actuales de <FramedImage> siguen funcionando y
   heredan el marco nuevo (card). F1/F2/F3 migran a <MediaFrame> con variantes. */
export function FramedImage(props: {
  src: string;
  alt: string;
  aspect: string;
  sizes: string;
  muted?: boolean;
}) {
  return <MediaFrame {...props} variant="card" />;
}
