"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { useTranslation } from "@/context/i18n.context";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const useMounted = () =>
  useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <IconButton
        icon={Sun}
        variant="ghost"
        aria-label={t("common.theme.toggle") || "Cambiar tema"}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <IconButton
      icon={isDark ? Sun : Moon}
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark
          ? t("common.theme.activate_light") || "Activar modo claro"
          : t("common.theme.activate_dark") || "Activar modo oscuro"
      }
    />
  );
};
