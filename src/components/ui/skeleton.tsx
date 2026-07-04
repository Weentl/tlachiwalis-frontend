import { cn } from "@/lib/utils";

/* Skeleton — placeholder de carga en tono arena (cálido, no gris). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[14px] bg-arena/70", className)} />;
}

/* Rejilla de cards fantasma para el catálogo mientras cargan las piezas. */
export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-[20px]" />
          <Skeleton className="mt-4 h-3 w-24" />
          <Skeleton className="mt-2 h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
