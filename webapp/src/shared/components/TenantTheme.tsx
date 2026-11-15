"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  deriveDarkVariant,
  deriveReadableText,
  normalizeBrandHex,
  shiftLightness,
} from "@/shared/lib/brand-theme";

interface TenantThemeProps {
  primary?: string | null;
  accent?: string | null;
  children?: ReactNode;
}

/** Lightness deltas for the hover/soft variants. */
const HOVER_LIGHTNESS = 0.08;
const SOFT_LIGHTNESS = -0.1;

/**
 * Scopes the tenant brand palette to its subtree.
 *
 * Writes the `--brand-*` custom properties consumed by `maison-style.ts`
 * (brass -> primary, navy -> accent) and keeps daisyUI's
 * `--color-primary`/`--color-accent` plus their `-content` in sync, so both the
 * Maison tokens and daisyUI components repaint with the tenant brand.
 *
 * Primary and accent are independent: a tenant with only one configured gets
 * only that family, and the missing family keeps the `:root` defaults declared
 * in `globals.css`. No valid color means no variable at all, so a tenant
 * without a palette looks exactly like the default app.
 *
 * The wrapper uses `display: contents` (layout-neutral). Every variable lives
 * in the element's inline `style`, so React removes the whole set on unmount or
 * when the props change; there is no imperative cleanup to perform.
 */
export function TenantTheme({ primary, accent, children }: TenantThemeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const style = useMemo<CSSProperties>(() => {
    const variables: Record<string, string> = {};

    const normalizedPrimary = normalizeBrandHex(primary);
    if (normalizedPrimary) {
      const daisyPrimary = isDark
        ? deriveDarkVariant(normalizedPrimary)
        : normalizedPrimary;

      variables["--brand-primary"] = normalizedPrimary;
      variables["--brand-primary-hover"] = shiftLightness(
        normalizedPrimary,
        HOVER_LIGHTNESS,
      );
      variables["--brand-primary-soft"] = shiftLightness(
        normalizedPrimary,
        SOFT_LIGHTNESS,
      );
      variables["--brand-primary-on-dark"] = deriveDarkVariant(normalizedPrimary);
      variables["--brand-primary-contrast"] =
        deriveReadableText(normalizedPrimary);

      variables["--color-primary"] = daisyPrimary;
      variables["--color-primary-content"] = deriveReadableText(daisyPrimary);
    }

    const normalizedAccent = normalizeBrandHex(accent);
    if (normalizedAccent) {
      const daisyAccent = isDark
        ? deriveDarkVariant(normalizedAccent)
        : normalizedAccent;

      variables["--brand-accent"] = normalizedAccent;
      variables["--brand-accent-hover"] = shiftLightness(
        normalizedAccent,
        HOVER_LIGHTNESS,
      );
      variables["--brand-accent-contrast"] = deriveReadableText(normalizedAccent);

      variables["--color-accent"] = daisyAccent;
      variables["--color-accent-content"] = deriveReadableText(daisyAccent);
    }

    return variables as CSSProperties;
  }, [primary, accent, isDark]);

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}
