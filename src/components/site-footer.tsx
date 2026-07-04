export function SiteFooter() {
  return (
    <footer className="mt-auto bg-tinta text-cal/80">
      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <p className="font-wordmark text-6xl font-semibold tracking-tight text-cal/90 sm:text-7xl">
          Tlachiwalis
        </p>
        <p className="mx-auto mt-4 max-w-md font-serif text-lg italic text-cal/70">
          Náhuatl: lo que se crea con las manos. Arte popular mexicano, directo del taller.
        </p>
      </div>
      <div className="border-t border-cal/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-cal/50 sm:flex-row">
          <span>Hecho a mano en México</span>
          <span>© 2026 Tlachiwalis</span>
        </div>
      </div>
    </footer>
  );
}
