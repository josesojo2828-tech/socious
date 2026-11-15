"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  deriveDarkVariant,
  normalizeBrandHex,
} from "@/shared/lib/brand-theme";

interface TenantThemeProps {
  primary?: string | null;
  accent?: string | null;
  children?: ReactNode;
}

/**
 * Scopes the tenant brand colors to its subtree by writing ONLY the
 * `--color-primary` and `--color-accent` custom properties. daisyUI/Tailwind
 * consumers below it pick them up through inheritance.
 *
 * No brand color means no variable at all: the component renders an empty
 * style, so a tenant without a palette looks exactly like the default app.
 * In dark mode each color is lifted by `deriveDarkVariant` so it stays legible
 * on the dark surface.
 *
 * The wrapper uses `display: contents`, so it adds layout-neutral scope only;
 * unmounting or changing props lets React drop the variables with it.
 */
export function TenantTheme({ primary, accent, children }: TenantThemeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const style = useMemo<CSSProperties>(() => {
    const variables: Record<string, string> = {};

    const normalizedPrimary = normalizeBrandHex(primary);
    if (normalizedPrimary) {
      variables["--color-primary"] = isDark
        ? deriveDarkVariant(normalizedPrimary)
        : normalizedPrimary;
    }

    const normalizedAccent = normalizeBrandHex(accent);
    if (normalizedAccent) {
      variables["--color-accent"] = isDark
        ? deriveDarkVariant(normalizedAccent)
        : normalizedAccent;
    }

    return variables as CSSProperties;
  }, [primary, accent, isDark]);

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}
