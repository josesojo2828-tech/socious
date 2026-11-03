"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/context/i18n.context";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const useMounted = () =>
  useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

/**
 * Auth chrome: pearl field (light) / deep navy (dark), brass accents, the
 * same S mark as the landing header. Shared by all five auth screens.
 */
export const AuthHeader = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="w-full bg-[#f0ede4]/95 dark:bg-[#111527]/95 backdrop-blur-md border-b border-[#1a2a46]/10 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between z-30 transition-colors">
      {/* Brand mark — identical to the landing header */}
      <Link
        href="/"
        className="flex items-center gap-2.5 group transition-transform active:scale-95"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1a2a46] dark:bg-[#b2944a] text-[#b2944a] dark:text-[#111018] text-sm font-bold shadow-xs group-hover:scale-105 transition-transform">
          S
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display text-sm font-semibold tracking-tight text-[#111018] dark:text-[#f0ede4]">
            Socius
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#b2944a] mt-0.5">
            ERP
          </span>
        </span>
      </Link>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1a2a46]/70 dark:text-[#f0ede4]/70 hover:text-[#111018] dark:hover:text-[#f0ede4] hover:bg-[#1a2a46]/[0.06] dark:hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">
            {t("common.nav.home") || "Volver al inicio"}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-2 rounded-xl text-[#1a2a46]/70 dark:text-[#f0ede4]/70 hover:text-[#b2944a] hover:bg-[#b2944a]/10 transition-all border border-[#1a2a46]/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#b2944a]/30"
          aria-label={
            isDark
              ? t("common.theme.activate_light") || "Activar modo claro"
              : t("common.theme.activate_dark") || "Activar modo oscuro"
          }
          title={isDark ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDark ? (
            <Sun size={18} className="text-[#b2944a] animate-in spin-in-90 duration-300" />
          ) : (
            <Moon size={18} className="text-[#1a2a46] animate-in spin-in-90 duration-300" />
          )}
        </button>
      </div>
    </header>
  );
};
