import { Lock } from "lucide-react";
import { GLASS } from "@/shared/lib/maison-style";

/**
 * Honest empty state for a plan without the OFFERS module (S9): the offer
 * screens are Avanzado+, so instead of rendering forms whose writes would
 * all answer 403, we say plainly what is missing.
 */
export function OffersLockedState() {
  return (
    <div className={`rounded-2xl px-6 py-12 text-center ${GLASS}`}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#1a2a46]/10 dark:bg-white/10">
        <Lock className="h-5 w-5 text-[#1a2a46]/70 dark:text-slate-300" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-[#111018] dark:text-slate-100">
        Requiere el plan Avanzado o superior
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Las ofertas están disponibles en los planes Avanzado y Premium.
        Actualiza tu plan para crear promociones con banner, fecha de
        vencimiento y productos de tu catálogo.
      </p>
    </div>
  );
}
