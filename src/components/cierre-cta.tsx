import Link from "next/link";
import { botonCls } from "@/components/ui/boton";
import { cn } from "@/lib/utils";

// Cierre de la landing: el porqué emocional + última acción + la única mención al reclutamiento
// de artesanos. Banda grana (drenched, permitido en el cierre).
export function CierreCta() {
  return (
    <section className="bg-grana text-[#FFF7EE]">
      <div className="mx-auto max-w-2xl px-6 py-16 text-center md:py-20">
        <h2 className="font-display text-4xl leading-tight sm:text-5xl">
          Cada compra sostiene un taller y mantiene vivo un oficio
        </h2>
        <p className="mx-auto mt-5 max-w-md leading-relaxed text-[#FFF7EE]/80">
          El precio que pagas es el precio que el artesano pidió.
        </p>
        <Link
          href="/tienda"
          className={cn(
            botonCls({ size: "lg", pill: true }),
            "mt-8 bg-[#FFF7EE] text-grana shadow-none hover:bg-white",
          )}
        >
          Explorar la tienda
        </Link>
        <p className="mt-6 text-sm text-[#FFF7EE]/80">
          ¿Haces artesanía?{" "}
          <Link href="/unirse" className="underline decoration-[#FFF7EE]/50 underline-offset-4 hover:text-white">
            Vende en Tlachiwalis →
          </Link>
        </p>
      </div>
    </section>
  );
}
