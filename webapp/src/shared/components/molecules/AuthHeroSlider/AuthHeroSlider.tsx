import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/context/i18n.context";

/**
 * Brand panel shared by the five auth screens (login, registro, recuperación,
 * verificación). Replaces the old Nutringest slider (photo + purple gradients)
 * with the Socius language: dark slate, indigo accent, no imagery — the
 * product speaks through what it does.
 */
export const AuthHeroSlider = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white select-none lg:p-14">
      {/* Accent: a single quiet indigo edge instead of gradients */}
      <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />

      {/* Wordmark */}
      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
          S
        </span>
        <span className="text-base font-semibold tracking-tight">
          Socius ERP
        </span>
      </div>

      {/* Value proposition */}
      <div className="relative z-10 space-y-6">
        <p className="max-w-md text-2xl font-semibold leading-snug tracking-tight text-slate-100 lg:text-3xl">
          Tu negocio, bajo control: inventario, caja, pedidos y envíos desde un
          solo lugar.
        </p>

        <ul className="space-y-3">
          {[
            "Catálogo con stock y kardex de movimientos",
            "Cobros en USD, Bs y USDT con la tasa del día",
            "Pedidos online con envíos, delivery y rutas",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-800 ring-1 ring-slate-700">
                <Check className="h-3.5 w-3.5 text-indigo-400" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
        <span>© 2026 Socius ERP. Todos los derechos reservados.</span>
        <span className="flex items-center gap-3">
          <Link href="/terms" className="hover:text-slate-300">
            {t("common.nav.terms") || "Términos"}
          </Link>
          <Link href="/privacy" className="hover:text-slate-300">
            {t("common.nav.privacy") || "Privacidad"}
          </Link>
        </span>
      </div>
    </div>
  );
};
