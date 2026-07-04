"use client";
import { useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type SelectCfg = {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
};

export function FilterBar({
  selects,
  searchPlaceholder = "Buscar…",
}: {
  selects: SelectCfg[];
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(name: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    router.replace(p.toString() ? `${pathname}?${p}` : pathname, { scroll: false });
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", value.trim()), 300);
  }

  const activos = Array.from(sp.keys()).length > 0;
  const selectCls =
    "rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 [&>option]:bg-card [&>option]:text-foreground";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-ob border border-tinto/12 bg-card/60 p-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-ob-sm border border-tinto/20 bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-tinto/60"
        />
      </div>
      {selects.map((s) => (
        <select
          key={s.name}
          value={sp.get(s.name) ?? ""}
          onChange={(e) => setParam(s.name, e.target.value)}
          className={selectCls}
          aria-label={s.label}
        >
          <option value="">{s.label}: todos</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {activos ? (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="inline-flex items-center gap-1 rounded-ob-sm px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-tinto"
        >
          <X className="h-3.5 w-3.5" /> Limpiar
        </button>
      ) : null}
    </div>
  );
}
