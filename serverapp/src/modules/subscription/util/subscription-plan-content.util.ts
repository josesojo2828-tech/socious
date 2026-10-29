/**
 * Normalizer for `SubscriptionPlan.content`.
 *
 * Historical plans store `content` as a `string[]` of display bullets. The
 * entitlements engine needs structured machine keys, so the canonical shape is:
 *
 *   { features: string[]; grants: string[]; modules: string[] }
 *
 * This helper is BACKWARD-COMPATIBLE: it accepts either the legacy `string[]`
 * (mapped to `features`) or the new object shape, and always returns the
 * canonical object. Unknown/partial input degrades to empty arrays — it never
 * throws.
 */

export interface NormalizedSubscriptionPlanContent {
  /** Human-readable feature bullets (legacy `content`). */
  features: string[];
  /** Machine permission keys granted by the plan. */
  grants: string[];
  /** Module keys unlocked by the plan (sidebar/route registry). */
  modules: string[];
}

export const DEFAULT_PLAN_ENTITLEMENTS: Record<
  string,
  { grants: string[]; modules: string[] }
> = {
  PREMIUM: {
    grants: [
      "PREMIUM_ACCESS",
      "COMMUNITY_ACCESS",
      "COMMUNITY_BROWSE",
      "COMMUNITY_IMPORT",
      "COMMUNITY_PUBLISH",
      "PORTFOLIO_MANAGE",
      "INSTITUTIONAL_FOOD_ACCESS",
      "CALCULADORA_PREMIUM_ACCESS",
    ],
    modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"],
  },
  CLINICA: {
    grants: [
      "PREMIUM_ACCESS",
      "COMMUNITY_ACCESS",
      "COMMUNITY_BROWSE",
      "COMMUNITY_IMPORT",
      "COMMUNITY_PUBLISH",
      "PORTFOLIO_MANAGE",
      "INSTITUTIONAL_FOOD_ACCESS",
      "CALCULADORA_PREMIUM_ACCESS",
    ],
    modules: ["COMMUNITY", "PORTFOLIO", "INSTITUTIONAL_FOOD"],
  },
  PRO: {
    grants: [
      "PRO_ACCESS",
      "COMMUNITY_ACCESS",
      "CALCULADORA_PREMIUM_ACCESS",
    ],
    modules: ["COMMUNITY"],
  },
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizePlanKey(nameOrId?: string | null): string {
  if (!nameOrId) return "";
  return nameOrId
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function normalizeSubscriptionPlanContent(
  content: unknown,
  planKeyOrName?: string | { id?: string | null; name?: string | null } | null,
): NormalizedSubscriptionPlanContent {
  let actualContent = content;
  let targetPlanName: string | null = null;

  if (typeof planKeyOrName === "string") {
    targetPlanName = planKeyOrName;
  } else if (planKeyOrName && typeof planKeyOrName === "object") {
    targetPlanName = planKeyOrName.name || planKeyOrName.id || null;
  }

  if (
    actualContent &&
    typeof actualContent === "object" &&
    !Array.isArray(actualContent) &&
    ("content" in actualContent || "id" in actualContent || "name" in actualContent) &&
    !("features" in actualContent || "grants" in actualContent || "modules" in actualContent)
  ) {
    const record = actualContent as Record<string, unknown>;
    if (!targetPlanName) {
      targetPlanName = (record.name as string) || (record.id as string) || null;
    }
    if ("content" in record) {
      actualContent = record.content;
    }
  }

  const normalizedKey = normalizePlanKey(targetPlanName);
  let defaults = DEFAULT_PLAN_ENTITLEMENTS[normalizedKey];

  if (!defaults && normalizedKey) {
    if (normalizedKey.includes("PREMIUM") || normalizedKey.includes("CLINIC")) {
      defaults = DEFAULT_PLAN_ENTITLEMENTS.PREMIUM;
    } else if (normalizedKey.includes("PRO")) {
      defaults = DEFAULT_PLAN_ENTITLEMENTS.PRO;
    }
  }

  // Legacy shape: string[] of display bullets.
  if (Array.isArray(actualContent)) {
    return {
      features: toStringArray(actualContent),
      grants: defaults?.grants ?? [],
      modules: defaults?.modules ?? [],
    };
  }

  // Canonical shape (or any object): coerce each field defensively.
  if (actualContent && typeof actualContent === "object") {
    const record = actualContent as Record<string, unknown>;
    const features = toStringArray(record.features);
    const parsedGrants = toStringArray(record.grants);
    const parsedModules = toStringArray(record.modules);

    const grants = parsedGrants.length > 0 ? parsedGrants : (defaults?.grants ?? []);
    const modules = parsedModules.length > 0 ? parsedModules : (defaults?.modules ?? []);

    return {
      features,
      grants,
      modules,
    };
  }

  return {
    features: [],
    grants: defaults?.grants ?? [],
    modules: defaults?.modules ?? [],
  };
}

/** True when the value is already the canonical object shape. */
export function isNormalizedSubscriptionPlanContent(content: unknown): boolean {
  return !!content && typeof content === "object" && !Array.isArray(content);
}

