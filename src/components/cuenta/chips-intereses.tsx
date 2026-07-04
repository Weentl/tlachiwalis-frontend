import { oficios } from "@/lib/products";

// Chips de oficios (intereses del comprador). Checkbox CSS puro (peer-checked). Reutilizado en
// el onboarding y en el perfil. El sentinel `_intereses` le dice al server action que sí actualice.
export function ChipsIntereses({ seleccionados = [] }: { seleccionados?: string[] }) {
  const sel = new Set(seleccionados);
  return (
    <>
      <input type="hidden" name="_intereses" value="1" />
      <div className="flex flex-wrap gap-2">
        {oficios.map((o) => (
          <label key={o} className="cursor-pointer">
            <input
              type="checkbox"
              name="intereses"
              value={o}
              defaultChecked={sel.has(o)}
              className="peer sr-only"
            />
            <span className="inline-block rounded-full border border-linea px-4 py-2 text-sm text-tinta transition-colors hover:border-ceniza/50 peer-checked:border-grana peer-checked:bg-grana peer-checked:text-[#FFF7EE]">
              {o}
            </span>
          </label>
        ))}
      </div>
    </>
  );
}
