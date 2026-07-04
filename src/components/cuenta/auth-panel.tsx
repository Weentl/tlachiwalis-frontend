/* Panel visual de las pantallas de auth (split-screen). Superficie añil (confianza) con
   degradado grana y una cita en Fraunces. Oculto en móvil. */
export function AuthPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-[24px] bg-anil md:block">
      <div className="absolute inset-0 bg-gradient-to-br from-grana/40 via-anil to-anil" />
      <div
        aria-hidden
        className="portal absolute -right-16 -top-20 h-72 w-72 bg-cal/10"
      />
      <div className="relative flex h-full flex-col justify-between p-10">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-cal/70">
          Tlachiwalis
        </p>
        <div>
          <p className="font-display text-[2rem] leading-[1.15] text-cal">
            &ldquo;Cada pieza guarda las manos que la hicieron.&rdquo;
          </p>
          <p className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-cal/70">
            Arte popular mexicano · directo del taller
          </p>
        </div>
      </div>
    </div>
  );
}
