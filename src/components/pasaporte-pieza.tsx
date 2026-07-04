/* Pasaporte de la pieza — firma "Manos": ficha de datos duros (material, taller,
   región, técnica, medidas…) como spec anti-producción-en-masa. Server component. */
export function PasaportePieza({ filas }: { filas: [string, string][] }) {
  if (filas.length === 0) return null;
  return (
    <div className="mt-8 rounded-[18px] border border-linea bg-lino p-5 shadow-pieza">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ceniza">
        Pasaporte de la pieza
      </p>
      <dl className="mt-3 divide-y divide-linea">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 py-2.5">
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-ceniza">
              {k}
            </dt>
            <dd className="text-right text-sm text-tinta">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
