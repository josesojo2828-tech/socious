import { Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SociusBulb } from "@/shared/components/atoms/SociusBulb";
import { useTranslation } from "@/context/i18n.context";

/**
 * Brand panel shared by the five auth screens (login, registro, recuperación,
 * verificación). Maison Lévrier language: deep navy field, brass edge and
 * mark, pearl type, Fraunces display — same palette as the landing and the
 * sidebar. No imagery; the product speaks through what it does.
 */
export const AuthHeroSlider = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#111527] p-10 text-[#f0ede4] select-none lg:p-14">
      {/* Accent: a single quiet brass edge instead of gradients */}
      <div className="absolute inset-y-0 left-0 w-1 bg-[#b2944a]" />

      {/* Subtle radial lift so the navy is not flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(178,148,74,0.12), transparent 55%)",
        }}
      />

      {/* Wordmark — Socius lightbulb pure vector (no background) */}
      <div className="relative z-10 flex items-center gap-3.5">
        <SociusBulb
          size={54}
          className="text-[#f0ede4] shrink-0"
        />
        <span className="flex flex-col">
          <span className="font-display text-2xl font-bold tracking-tight leading-none text-[#f0ede4]">
            Socius
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#b2944a] mt-1.5 font-semibold">
            ERP
          </span>
        </span>
      </div>

      {/* Value proposition */}
      <div className="relative z-10 space-y-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b2944a]">
          Gestión comercial
        </p>
        <p className="max-w-md font-display text-2xl font-semibold leading-snug tracking-tight text-[#f0ede4] lg:text-[32px]">
          Tu negocio, bajo control: inventario, caja, pedidos y envíos{" "}
          <span className="italic font-normal text-[#b2944a]">
            sin planillas sueltas.
          </span>
        </p>

        <ul className="space-y-3">
          {[
            "Catálogo con stock y kardex de movimientos",
            "Cobros en USD, Bs y USDT con la tasa del día",
            "Pedidos online con envíos, delivery y rutas",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-[#f0ede4]/75"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#b2944a]/15 ring-1 ring-[#b2944a]/40">
                <Check className="h-3 w-3 text-[#b2944a]" />
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Mascot Assistant Card */}
        <div className="flex items-center gap-3.5 bg-white/[0.04] backdrop-blur-xs border border-white/10 px-4 py-3 rounded-2xl max-w-sm mt-6">
          <Image
            src="/mascot.png"
            alt="Socius"
            width={48}
            height={55}
            className="shrink-0 drop-shadow-[0_8px_16px_rgba(245,158,11,0.25)]"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-[#f0ede4]">
              ¡Tu negocio inteligente!
            </span>
            <span className="text-[11px] text-[#f0ede4]/65 leading-tight mt-0.5">
              Inventario, caja multimoneda y ventas en tiempo real sin planillas sueltas.
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-xs text-[#f0ede4]/45">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
          © 2026 Socius ERP
        </span>
        <span className="flex items-center gap-3">
          <Link
            href="/terms"
            className="hover:text-[#b2944a] transition-colors"
          >
            {t("common.nav.terms") || "Términos"}
          </Link>
          <span className="w-[3px] h-[3px] rounded-full bg-[#b2944a]/60" />
          <Link
            href="/privacy"
            className="hover:text-[#b2944a] transition-colors"
          >
            {t("common.nav.privacy") || "Privacidad"}
          </Link>
        </span>
      </div>
    </div>
  );
};
