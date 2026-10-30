import Link from "next/link";

/**
 * Minimal chrome for the public legal/content pages (Términos, Aviso,
 * Acerca de, Blog): same visual language as the Socius landing — white
 * surface, 1px borders, indigo only on the primary action.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
          Socius ERP
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            Inicio
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            Acceder
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
          >
            Probar Socius
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row">
        <span>Socius ERP · Gestión de negocio</span>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-slate-700">
            Términos y condiciones
          </Link>
          <Link href="/privacy" className="hover:text-slate-700">
            Aviso de privacidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
