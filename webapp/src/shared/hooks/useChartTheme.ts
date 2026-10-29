"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { DARK_CHART_THEME, LIGHT_CHART_THEME } from "@/shared/lib/chart/chartConfig";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  if (!mounted) return LIGHT_CHART_THEME;
  return resolvedTheme === "dark" ? DARK_CHART_THEME : LIGHT_CHART_THEME;
}
