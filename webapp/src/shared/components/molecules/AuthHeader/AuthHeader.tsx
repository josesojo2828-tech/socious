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

export const AuthHeader = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="w-full bg-base-100/90 backdrop-blur-md border-b border-base-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between z-30 transition-colors">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
        <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Socius ERP
        </span>
      </Link>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Back to home link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-base-content/70 hover:text-primary hover:bg-base-200/60 transition-all"
        >
          <ArrowLeft size={16} />
          <span>{t("common.nav.home") || "Volver al inicio"}</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-2 rounded-xl text-base-content/70 hover:text-primary hover:bg-base-200/60 transition-all border border-base-200/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label={
            isDark
              ? t("common.theme.activate_light") || "Activar modo claro"
              : t("common.theme.activate_dark") || "Activar modo oscuro"
          }
          title={isDark ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDark ? (
            <Sun size={20} className="text-amber-400 animate-in spin-in-90 duration-300" />
          ) : (
            <Moon size={20} className="text-indigo-600 animate-in spin-in-90 duration-300" />
          )}
        </button>
      </div>
    </header>
  );
};
